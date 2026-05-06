import { supabase } from './supabase';

class WebRTCManager {
  constructor() {
    this.peers = {}; // mapping of userId -> RTCPeerConnection
    this.localStream = null;
    this.channel = null;
    this.roomId = null;
    this.myUserId = null;
    this.isMuted = false;
    this.isSpeakerMuted = false;
    this.remoteAudios = {}; // mapping of userId -> HTMLAudioElement
  }

  async joinVoice(roomId, myUserId) {
    if (this.channel) return; // Already joined
    
    this.roomId = roomId;
    this.myUserId = String(myUserId);

    this.channel = supabase.channel(`voice-${roomId}`, {
      config: {
        broadcast: { ack: false },
      },
    });

    this.channel
      .on('broadcast', { event: 'webrtc-signal' }, (payload) => {
        this.handleSignal(payload.payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Announce presence so others can initiate connection
          this.broadcast({ type: 'join', senderId: this.myUserId });
        }
      });
  }

  leaveVoice() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    Object.keys(this.peers).forEach(peerId => this.closePeer(peerId));
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.roomId = null;
    this.myUserId = null;
  }

  broadcast(message) {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: message
      });
    }
  }

  async handleSignal(message) {
    const { type, senderId, targetId, sdp, candidate } = message;

    // Ignore messages not meant for us (unless it's a general 'join' broadcast)
    if (targetId && targetId !== this.myUserId) return;
    if (senderId === this.myUserId) return;

    if (type === 'join') {
      // Someone joined, we should initiate a connection (create offer)
      // To avoid both creating offers, let the lexicographically smaller ID create the offer.
      if (this.myUserId < senderId) {
        const pc = this.getOrCreatePeer(senderId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.broadcast({ type: 'offer', senderId: this.myUserId, targetId: senderId, sdp: pc.localDescription });
      }
    } else if (type === 'offer') {
      const pc = this.getOrCreatePeer(senderId);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.broadcast({ type: 'answer', senderId: this.myUserId, targetId: senderId, sdp: pc.localDescription });
    } else if (type === 'answer') {
      const pc = this.getOrCreatePeer(senderId);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    } else if (type === 'ice-candidate') {
      const pc = this.getOrCreatePeer(senderId);
      if (candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }
  }

  getOrCreatePeer(peerId) {
    if (this.peers[peerId]) return this.peers[peerId];

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Add receive-only transceiver so we can receive audio even before we have a mic
    pc.addTransceiver('audio', { direction: 'recvonly' });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.broadcast({
          type: 'ice-candidate',
          senderId: this.myUserId,
          targetId: peerId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      // Create an audio element for this remote peer
      let audio = this.remoteAudios[peerId];
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        this.remoteAudios[peerId] = audio;
      }
      // Ensure we don't accidentally attach the local stream
      // WebRTC streams from ontrack are remote streams.
      audio.srcObject = event.streams[0];
      audio.muted = this.isSpeakerMuted;
    };

    // Close peer if connection fails or disconnects
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeer(peerId);
      }
    };
    
    // Automatically renegotiate when tracks are added later
    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.broadcast({ type: 'offer', senderId: this.myUserId, targetId: peerId, sdp: pc.localDescription });
      } catch (err) {
        console.error("Error during renegotiation", err);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
    }

    this.peers[peerId] = pc;
    return pc;
  }

  closePeer(peerId) {
    if (this.peers[peerId]) {
      this.peers[peerId].close();
      delete this.peers[peerId];
    }
    if (this.remoteAudios[peerId]) {
      this.remoteAudios[peerId].pause();
      this.remoteAudios[peerId].srcObject = null;
      delete this.remoteAudios[peerId];
    }
  }

  async toggleMic(muted) {
    let targetMute = muted !== undefined ? muted : !this.isMuted;

    // If trying to unmute and we don't have permission/stream yet, request it
    if (!targetMute && !this.localStream) {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
        
        // Add tracks to all existing peers to trigger renegotiation
        Object.keys(this.peers).forEach(peerId => {
           const pc = this.peers[peerId];
           this.localStream.getTracks().forEach(track => {
             pc.addTrack(track, this.localStream);
           });
        });
      } catch (err) {
        console.error("Microphone access denied or failed", err);
        return true; // Force muted if permission denied
      }
    }

    this.isMuted = targetMute;
    
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    return this.isMuted;
  }

  toggleSpeaker(muted) {
    if (muted !== undefined) {
      this.isSpeakerMuted = muted;
    } else {
      this.isSpeakerMuted = !this.isSpeakerMuted;
    }
    
    Object.values(this.remoteAudios).forEach(audio => {
      audio.muted = this.isSpeakerMuted;
    });
    return this.isSpeakerMuted;
  }
  
  isConnected() {
    return this.channel !== null;
  }
}

export const webrtc = new WebRTCManager();
