window.URL = window.URL || window.webkitURL;
window.isRtcSupported = !!(window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection);

class RTCPeer {
    constructor(serverConnection, peerID){
        if(!peerID) return;
        this._connet(peerID,true);
    }

    _connet(peerID,isCaller){ //rtc连接相关
        if(!this._RTCconnet) this._openConnection(peerID,isCaller)
        if(isCaller) //呼叫者存在，请求连接，此时建立datachannel
            this._openChannel();
        else  //不存在，则通道已开启
            this._RTCconnet.ondataChannel = e => this._onChannelOpened(e);
    }

    _openConnection(peerID,isCaller){ //创建rtc连接
        this.isCaller = isCaller; //布尔值，标记是否存在呼叫者
        this.peerID = peerID; 
        this._RTCconnet = new RTCPeerConnection(RTCCPeer.config);
        this._RTCconnet.onice = e => this._onIceCandidate(e); //发送ICE信息
        this._RTCconnet.oniceconnectionstate = e => this._onICEConnectionState(e); //检测ICE连接状态
        this._RTCconnet.onconnectionstate = e => this._onConnectionState(e); //检测RTC连接状态
    }

    _openChannel(){ //创建datachannel，并进行sdp交换
        const channel = this._RTCconnet.createDataChannel('datachannel',{ordered:true}); //创建p2p连接通道
        channel.binaryType = 'arraybuffer'; //设置数据类型
        channel.onopen = e => this._onChannelOpened(e); //通道已经开启的处理函数
        this._RTCconnet.createOffer().then(d => this._onDescription(d)).catch(e => this._onError(e));
    }

    _sendSingnal(signal){ //发送message至服务器
        signal.type = 'signal';
        signal.to = this_peerID;
        this._server.send(signal);
    }

    _onConnectionStateClosed() { //检测rtc连接状态
        switch(this._RTCconnet.connetionState){
            case 'disconnected':
                this._onChannelClosed();
                break;
            case 'failed':
                this._connet = null;
                this._onChannelClosed();
                break;
        }
    }

    _onICEConnectionState(){ //监测ice连接状态
        switch(this._RTCconnet.iceConnectionState){
            case 'failed':
                console.error('ICE failed');
            default:
                console.log('ICE' + this._connet.iceConnectionState);
        }
    }

    _onChannelOpened(event){ //RTC通道开启后
        const channel = event.channel || event.target;
        channel.onmessage = e => this._onMessage(e.data); //判断消息类型并处理
        channel.onclose = e => this._onChannelClosed; //重建通道
        this._channel = channel;
    }

    _onServerMessage(message){ //sdp，ice交换
        if(!this._connet) this._connet(message.sender,false); //如果连接不存在，则重建连接
        if(message.sdp){
            this._RTCconnet.setRemoteDescription(message.sdp) //存储sdp
                .then(_ => {
                    if(message.sdp.type === 'offer'){ //如果是offer，则回应，否则下一步
                        return this._RTCconnet.createAnswer() //创建answer
                                   .then(d => this._onDescription(d)) //存储为本地描述并发送
                    }
                })
                .catch(e => this._onError(e));
        } else if(message.ice){ //sdp交换结束，存储ice
            this._RTCconnet.addIceCandidate(new RTCIceCandidate(message.ice))
        }
    }

    _onDescription(description){ //发送offer
        this._RTCconnet.setLocalDescription(description) //存储本地offer描述
                    .then(_ => this._sendSingnal({sdp:description}))
                    .catch(e => this._onError);
    }

    _onChannelClosed(){ //重新创建dataChannel
        if(!this.isCaller) return; 
        this._connet(this._peerID,true);
    }

    _onIceCandidate(event){ //发送ice
        if(!event.candidate) return;
        this._sendSingnal( {ice:event.candidate} );
    }

    _onError(error) {
        console.error(error);
    }

    _send(message){ //datachannel发送信息
        if(!this._channel) return this.refresh();
        this._channel.send(message);
    }

    refresh(){ //检查通道连接状态
        let channelstate1 =  this._channel && this._channel.readyState === 'open';
        let channelstate2 = this._channel && this._channel.readyState === 'connecting';
        if(channelstate1 || channelstate2 ) return;
        this._connet(this.peerID,this.isCaller)
    }
}

class FileChunker{ 
    constructor(file,onChunk,onParitionEnd){
        this._readchunkSize = 64000; //64KB,读取大小
        this._maxPartitionSize = 1e6; //1MB,最大分区大小
        this._offset = 0; //偏移量，标记读取位置
        this._ParitionSize = 0; //分区大小
        this._file = file;
        this._onChunk = onChunk; //切片事件
        this._onPartitionEnd = onParitionEnd; //分区结束标记
        this._reader = new FileReader(); //FileReader对象，能异步读取用户计算机上的文件或原始数据缓冲区的内容
        /*this._reader.addEventListener('load',e=>this._onChunkRead(e.target.result)); //页面依赖*/
    }

    _readChunk(){
        const chunk = this._file.slice(this._offset,this._offset + this._chunkSize);
        this._reader.readAsArrayBuffer(chunk);
    }

    _nextPartition(){
        this._partitionSize = 0;
        this._readChunk();
    }
}

RTCCPeer.config = {
    'sdpSemantics': 'unified-plan',
    'iceServers': [{
        urls:'stun:stun.l.google.com:19302'
    }]
}