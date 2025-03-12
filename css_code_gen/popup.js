document.addEventListener('DOMContentLoaded', function() {
    const toggleSwitch = document.getElementById('toggleSwitch');

    // 从存储中获取开关状态
    chrome.storage.local.get(['isEnabled'], function(result) {
        toggleSwitch.checked = result.isEnabled || false;
    });

    // 监听开关状态变化
    toggleSwitch.addEventListener('change', async function() {
        const isEnabled = toggleSwitch.checked;
        
        // 保存开关状态
        await chrome.storage.local.set({ isEnabled: isEnabled });

        // 向content script发送消息
        try {
            const tabs = await chrome.tabs.query({active: true, currentWindow: true});
            if (tabs && tabs.length > 0) {
                // 添加重试机制
                let retryCount = 0;
                const maxRetries = 3;
                const retryDelay = 500; // 500ms

                async function sendMessageWithRetry() {
                    try {
                        await chrome.tabs.sendMessage(tabs[0].id, { 
                            action: 'toggleSelector', 
                            isEnabled: isEnabled 
                        });
                    } catch (error) {
                        if (retryCount < maxRetries) {
                            retryCount++;
                            console.log(`重试第${retryCount}次...`);
                            await new Promise(resolve => setTimeout(resolve, retryDelay));
                            await sendMessageWithRetry();
                        } else {
                            console.error('发送消息失败，已达到最大重试次数：', error);
                            // 可以在这里添加用户提示
                            alert('操作失败，请刷新页面后重试');
                        }
                    }
                }

                await sendMessageWithRetry();
            }
        } catch (error) {
            console.error('通信错误：', error);
            alert('无法与页面通信，请刷新页面后重试');
        }
    });
});
