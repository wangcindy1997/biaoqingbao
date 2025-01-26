document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const responseDiv = document.getElementById('response');

    // API配置
    const API_URL = 'https://api.coze.cn/v3/chat';
    const API_KEY = 'pat_QpSGAOiOjjeQ987aQNwSFKiAHTf0B44KDzd5FfzTBw4vtjGm28ukcYxqPsnS6lS8';
    const BOT_ID = '7464094095808888872';
    const USER_ID = '123456789';

    async function sendMessage() {
        // 清空之前的响应
        responseDiv.textContent = '';
        
        const message = messageInput.value.trim();
        if (!message) return;

        // 禁用发送按钮，防止重复发送
        sendButton.disabled = true;

        // 用于跟踪已显示的内容
        const shownContents = new Set();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bot_id: BOT_ID,
                    user_id: USER_ID,
                    stream: true,
                    auto_save_history: true,
                    additional_messages: [
                        {
                            role: 'user',
                            content: message,
                            content_type: 'text'
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 获取响应的ReadableStream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            // 循环读取流数据
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }

                // 解码并处理数据
                buffer += decoder.decode(value, { stream: true });
                
                // 按行处理事件
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 保留最后一个不完整的行

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    
                    // 解析事件行
                    if (line.startsWith('event:')) {
                        const eventType = line.slice(6).trim();
                        continue;
                    }
                    
                    // 解析数据行
                    if (line.startsWith('data:')) {
                        try {
                            const data = JSON.parse(line.slice(5));
                            
                            // 处理不同类型的消息
                            if ((data.type === 'answer' || data.type === 'tool_response') && data.content) {
                                // 检查内容是否已经显示过
                                if (!shownContents.has(data.content)) {
                                    shownContents.add(data.content);
                                    
                                    if (data.content.startsWith('http')) {
                                        // 如果是图片链接，显示图片
                                        const imgElement = document.createElement('img');
                                        imgElement.src = data.content;
                                        imgElement.style.maxWidth = '100%';
                                        responseDiv.appendChild(imgElement);
                                    } else {
                                        // 显示文本内容
                                        const textNode = document.createElement('p');
                                        textNode.textContent = data.content;
                                        responseDiv.appendChild(textNode);
                                    }
                                }
                            } else if (data.type === 'follow_up' && data.content) {
                                // 检查跟进问题是否已经显示过
                                if (!shownContents.has(data.content)) {
                                    shownContents.add(data.content);
                                    const followUpDiv = document.createElement('div');
                                    followUpDiv.className = 'follow-up';
                                    followUpDiv.textContent = `💡 ${data.content}`;
                                    responseDiv.appendChild(followUpDiv);
                                }
                            }
                        } catch (e) {
                            // 如果不是JSON格式，可能是[DONE]标记
                            if (line.includes('[DONE]')) {
                                break;
                            }
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error:', error);
            responseDiv.textContent = `发生错误: ${error.message}`;
        } finally {
            // 重新启用发送按钮
            sendButton.disabled = false;
        }
    }

    // 添加事件监听器
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});
