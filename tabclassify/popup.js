document.addEventListener('DOMContentLoaded', function() {
  let allExpanded = true; // 跟踪全局展开状态
  let markedHosts = {}; // 存储已标记的主机
  let markedTabs = {}; // 存储已标记的标签页

  // 确保Chrome API已经初始化
  if (chrome && chrome.storage && chrome.storage.local) {
    // 从 storage 加载标记状态
    chrome.storage.local.get(['markedHosts', 'markedTabs'], function(result) {
      if (result.markedHosts) markedHosts = result.markedHosts;
      if (result.markedTabs) markedTabs = result.markedTabs;
      loadTabs(); // 加载标签页并应用标记状态
    });
  } else {
    console.error('Chrome storage API not available');
    loadTabs(); // 即使没有存储的数据也要加载标签页
  }

  // 保存标记状态到 storage
  function saveMarkedState() {
    chrome.storage.local.set({
      markedHosts: markedHosts,
      markedTabs: markedTabs
    });
  }

  // 全局折叠/展开按钮功能
  document.getElementById('toggleAll').addEventListener('click', () => {
    const groups = document.querySelectorAll('.host-group');
    groups.forEach(group => {
      if (allExpanded) {
        group.classList.add('collapsed');
      } else {
        group.classList.remove('collapsed');
      }
    });
    allExpanded = !allExpanded;
  });

  // 处理右键菜单
  function handleContextMenu(e, type, data) {
    e.preventDefault();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    const isMarked = type === 'host' ? markedHosts[data] : markedTabs[data.id];

    menu.innerHTML = `
      <div class="menu-item ${isMarked ? 'marked' : ''}">
        ${isMarked ? '取消标记' : '标记'}
      </div>
      ${type === 'host' ? 
        `<div class="menu-item close-all">
          关闭所有标签页
        </div>` : 
        `<div class="menu-item close">
          关闭标签页
        </div>`
      }
    `;

    // 设置菜单位置
    menu.style.left = `${e.pageX}px`;
    menu.style.top = `${e.pageY}px`;
    document.body.appendChild(menu);

    // 点击菜单项处理
    menu.querySelector('.menu-item:first-child').addEventListener('click', () => {
      if (type === 'host') {
        if (markedHosts[data]) {
          delete markedHosts[data];
        } else {
          markedHosts[data] = true;
        }
        loadTabs(); // 重新加载以更新样式
      } else {
        if (markedTabs[data.id]) {
          delete markedTabs[data.id];
        } else {
          markedTabs[data.id] = true;
        }
        loadTabs(); // 重新加载以更新样式
      }
      saveMarkedState();
    });

    // 关闭标签页功能
    if (type === 'host') {
      menu.querySelector('.close-all').addEventListener('click', () => {
        chrome.tabs.query({}, function(tabs) {
          const tabsToClose = tabs.filter(tab => {
            try {
              return new URL(tab.url).hostname === data;
            } catch (e) {
              return false;
            }
          });
          tabsToClose.forEach(tab => chrome.tabs.remove(tab.id));
        });
      });
    } else {
      menu.querySelector('.close').addEventListener('click', () => {
        chrome.tabs.remove(data.id);
      });
    }

    // 点击其他地方关闭菜单
    document.addEventListener('click', function closeMenu() {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    });
}

  // 获取所有标签页
  function loadTabs() {
    chrome.tabs.query({}, function(tabs) {
      // 按host分组
      const groups = {};
      let totalTabs = 0;
      
      tabs.forEach(tab => {
        try {
          const url = new URL(tab.url);
          const host = url.hostname;
          
          if (!groups[host]) {
            groups[host] = [];
          }
          
          groups[host].push(tab);
          totalTabs++;
        } catch (e) {
          console.error('Invalid URL:', tab.url);
        }
      });

      // 渲染分组结果
      const container = document.getElementById('tabGroups');
      container.innerHTML = ''; // 清空现有内容
      
      Object.keys(groups).sort().forEach(host => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'host-group';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'host-title';
        titleDiv.innerHTML = `
          <span class="host-name">${host}</span>
          <span class="tab-count">${groups[host].length}</span>
        `;
        
        // 添加展开/折叠功能
        titleDiv.querySelector('.host-name').addEventListener('click', () => {
          groupDiv.classList.toggle('collapsed');
        });

        // 添加右键菜单
        titleDiv.addEventListener('contextmenu', (e) => {
          handleContextMenu(e, 'host', host);
        });
        
        groupDiv.appendChild(titleDiv);
        
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'tabs-container';
        
        groups[host].forEach(tab => {
          const tabDiv = document.createElement('div');
          tabDiv.className = `tab-item ${markedTabs[tab.id] ? 'marked' : ''} ${markedHosts[host] ? 'host-marked' : ''}`;
          
          tabDiv.title = tab.title; // 添加悬停提示
          
          // 添加标签页图标
          if (tab.favIconUrl) {
            const favicon = document.createElement('img');
            favicon.src = tab.favIconUrl;
            favicon.className = 'tab-favicon';
            tabDiv.insertBefore(favicon, tabDiv.firstChild);
          }

          const titleSpan = document.createElement('span');
          titleSpan.textContent = tab.title;
          tabDiv.appendChild(titleSpan);
          
          // 添加右键菜单
          tabDiv.addEventListener('contextmenu', (e) => {
            handleContextMenu(e, 'tab', tab);
          });
          
          // 点击切换到对应标签页
          tabDiv.addEventListener('click', () => {
            chrome.tabs.update(tab.id, { active: true });
            chrome.windows.update(tab.windowId, { focused: true });
          });
          
          tabsContainer.appendChild(tabDiv);
        });
        
        groupDiv.appendChild(tabsContainer);
        container.appendChild(groupDiv);
      });
    });
  }
});