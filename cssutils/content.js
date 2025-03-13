let isEnabled = false;

// 创建状态指示器
const statusIndicator = document.createElement('div');
statusIndicator.id = 'css-finder-status';
statusIndicator.style.display = 'none';
document.body.appendChild(statusIndicator);

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 处理元素悬停
function handleElementHover(event) {
    if (!isEnabled) return;
    
    const element = event.target;
    const classList = element.classList;
    
    // 移除之前的高亮效果
    const previousHighlight = document.querySelector('.css-finder-highlight');
    if (previousHighlight && previousHighlight !== element) {
        previousHighlight.classList.remove('css-finder-highlight');
    }
    
    // 添加高亮效果
    element.classList.add('css-finder-highlight');
    
    // 创建或更新提示框
    let tooltip = document.getElementById('css-finder-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'css-finder-tooltip';
        document.body.appendChild(tooltip);
    }
    
    // 收集元素信息
    const elementInfo = [];
    
    // 标签名
    elementInfo.push(`标签: ${element.tagName.toLowerCase()}`);
    
    // ID
    if (element.id) {
        elementInfo.push(`ID: ${element.id}`);
    }
    
    // 类名
    if (classList.length > 0) {
        elementInfo.push(`类名: ${Array.from(classList).join(' ')}`);
    }
    
    // name属性
    if (element.getAttribute('name')) {
        elementInfo.push(`name: ${element.getAttribute('name')}`);
    }
    
    // type属性（对于input等元素）
    if (element.getAttribute('type')) {
        elementInfo.push(`type: ${element.getAttribute('type')}`);
    }
    
    // value属性（对于input、button等元素）
    if (element.getAttribute('value')) {
        elementInfo.push(`value: ${element.getAttribute('value')}`);
    }
    
    // 获取元素的XPath
    function getXPath(element) {
        if (!element) return '';
        if (element.tagName.toLowerCase() === 'html') return '/html';
        
        let path = '';
        let current = element;
        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let index = 1;
            let sibling = current.previousSibling;
            
            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }
            
            const tagName = current.tagName.toLowerCase();
            const pathIndex = (index > 1) ? `[${index}]` : '';
            path = `/${tagName}${pathIndex}${path}`;
            
            current = current.parentNode;
        }
        return path;
    }
    
    // 添加XPath信息
    const xpath = getXPath(element);
    elementInfo.push(`XPath: ${xpath}`);
    
    // 设置提示框内容
    tooltip.innerHTML = elementInfo.join('<br>');
    
    // 设置提示框位置
    tooltip.style.left = `${event.pageX + 10}px`;
    tooltip.style.top = `${event.pageY + 10}px`;
    tooltip.style.display = 'block';
}

// 处理元素移出
function handleElementLeave(event) {
    if (!isEnabled) return;
    
    const element = event.target;
    element.classList.remove('css-finder-highlight');
    
    const tooltip = document.getElementById('css-finder-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// 创建防抖后的hover处理函数
const debouncedHover = debounce(handleElementHover, 100);

// 清理所有高亮和提示框
function cleanupHighlightAndTooltip() {
    const highlightedElement = document.querySelector('.css-finder-highlight');
    if (highlightedElement) {
        highlightedElement.classList.remove('css-finder-highlight');
    }
    
    const tooltip = document.getElementById('css-finder-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// 添加事件监听器
function addEventListeners() {
    // 先移除现有的事件监听器
    document.removeEventListener('mouseover', debouncedHover, true);
    document.removeEventListener('mouseout', handleElementLeave, true);
    
    if (isEnabled) {
        document.addEventListener('mouseover', debouncedHover, true);
        document.addEventListener('mouseout', handleElementLeave, true);
    } else {
        cleanupHighlightAndTooltip();
    }
}

// 从存储中获取初始状态并设置事件监听器
chrome.storage.local.get(['isEnabled'], function(result) {
    isEnabled = result.isEnabled || false;
    addEventListeners();
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'toggleSelector') {
        isEnabled = request.isEnabled;
        
        // 更新状态指示器
        statusIndicator.textContent = isEnabled ? '已启用选择器' : '已禁用选择器';
        statusIndicator.style.display = 'block';
        statusIndicator.className = isEnabled ? 'enabled' : 'disabled';
        
        // 更新事件监听器
        addEventListeners();
        
        // 3秒后隐藏状态指示器
        setTimeout(() => {
            statusIndicator.style.display = 'none';
        }, 2000);
    }
});