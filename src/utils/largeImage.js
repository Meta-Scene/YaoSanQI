export const showLargeImage = (dataUrl) => {
    if (!dataUrl) return;
    
    // 创建一个新窗口或标签页显示大图
    const newWindow = window.open();
    newWindow.document.write(`
        <html>
            <head>
                <title>Cesium 截图查看</title>
                <style>
                    body { 
                        margin: 0; 
                        padding: 0; 
                        background: #000; 
                        display: flex; 
                        justify-content: center; 
                        align-items: center;
                        height: 100vh;
                    }
                    img { 
                        max-width: 100%; 
                        max-height: 100%; 
                        object-fit: contain;
                    }
                    .close-btn {
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        background: gray;
                        color: white;
                        border: none;
                        padding: 5px 10px;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                </style>
            </head>
            <body>
                <img src="${dataUrl}" alt="Cesium 截图" />
                <button class="close-btn" onclick="window.close()">关闭</button>
            </body>
        </html>
    `);
};