import axios from 'axios';
const service = axios.create({
    baseURL: '/api',
    timeout: 80000,
});
// 响应拦截
service.interceptors.response.use((res) => {
    const { code, data, msg } = res.data;
    // 这样每次请求得到直接就是数据了 需要res.data
    if (code === 200) {
      return res.data;
    } else {
      // 处理业务错误
      console.error('API错误:', msg);
      return Promise.reject(new Error(msg || '请求失败'));
    }
  }, (error) => {
    // 处理网络错误
    console.error('网络错误:', error);
    return Promise.reject(error);
  });
export default{
    generateStandardBallisticData(params){
        return service({
            url: '/missile/trajectory/generateStandardBallisticData',
            method: 'post',
            data: params,
        });
    },
    
    // 命中弹道详细数据
    getBallisticsDetailedList(code){
        return service({
            url: '/missile/trajectory/ballisticsDetailedList',
            method: 'post',
            params: { code }
        });
    },
    getStandardBallisticDataList(){
      return service({
        url:'/missile/trajectory/standardBallisticList',
        method:'post'
      })
    }
}