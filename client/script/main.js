window.URL = window.URL || window.webkitURL;
window.isRtcSupported = !!(window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection);

class RTCpeer{
    document.querySelector//获取标签、类、ID

    _handleFileInputChange//选择文件

    _createConnection//创建rtc连接、datachannel，监听连接状态，传输保存ice，offer

    _sendData //发送数据。文件分片1MB，filereader，监听读取状态

    _closeDataChannels

    gotLocalDescription & gotRemoteDescription //获取本地与远程sdp描述

    _onSendChannelStateChange

    _onError
}

class receiveChannelCallback{}