// 新增：字符串转坐标点对象函数
const convertStringToPoints = (str) => {
    // 按空格分割字符串并过滤空值
    const parts = str.split(' ').filter(part => part.trim() !== '');
    
    // 检查是否有4个数值
    if (parts.length !== 4) {
      console.error('输入字符串格式不正确,需要4个数值,用空格分隔');
      return null;
    }
    
    // 转换为数字并创建对象
    return {
      startPoint: {
        x: parseFloat(parts[0]),
        y: parseFloat(parts[1])
      },
      endPoint: {
        x: parseFloat(parts[2]),
        y: parseFloat(parts[3])
      }
    };
  };

  export default convertStringToPoints;