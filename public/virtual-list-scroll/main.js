(() => {
  const TAB_DEFS = [
    {
      label: "固定高度虚拟列表(observer)",
      key: "observer",
    },
    {
      label: "固定高度虚拟列表(scroll)",
      key: "scroll",
    },
    {
      label: "动态高度虚拟列表",
      key: "dynamic",
    },
    {
      label: "普通列表",
      key: "normal",
    },
    {
      label: "动态高度虚拟列表(无图)",
      key: "dynamic-no-image",
    },
  ];

  const IMAGE_LIST = [
    "https://img1.baidu.com/it/u=2205810988,4283060315&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=500",
    "https://img1.baidu.com/it/u=1817473043,2931615020&fm=253&fmt=auto&app=138&f=JPEG?w=751&h=500",
    "https://img2.baidu.com/it/u=1311841100,1242016013&fm=253&fmt=auto&app=138&f=JPEG?w=400&h=866",
    "https://img0.baidu.com/it/u=1313222058,2618404585&fm=253&fmt=auto&app=120&f=JPEG?w=667&h=500",
  ];

  const toast = document.getElementById("toast");

  const state = {
    current: "动态高度虚拟列表",
  };

  const controllers = new Map();

  try {
    const data = createData(1000);
    initTabs();
    mountViews(data);
    setActive(state.current);
  } catch (error) {
    console.error("初始化失败:", error);
    showError("初始化失败，请查看控制台日志");
  }

  function showError(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden");
  }

  function initTabs() {
    const tabs = document.getElementById("tabs");
    if (!tabs) throw new Error("未找到 tabs 容器");
    tabs.innerHTML = "";

    TAB_DEFS.forEach((item) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "tab";
      tab.textContent = item.label;
      tab.addEventListener("click", () => setActive(item.label));
      tabs.appendChild(tab);
    });
  }

  function mountViews(data) {
    const content = document.getElementById("content");
    if (!content) throw new Error("未找到 content 容器");

    TAB_DEFS.forEach((item) => {
      const view = document.createElement("section");
      view.className = "view";
      view.dataset.label = item.label;
      content.appendChild(view);

      let controller;
      if (item.key === "normal") {
        controller = createNormalList(view, data);
      } else if (item.key === "scroll") {
        controller = createStaticScrollList(view, 50, 1000, 250);
      } else if (item.key === "observer") {
        controller = createObserverList(view, 50, 1000, 250);
      } else if (item.key === "dynamic") {
        controller = createDynamicHeightList(view, data, false);
      } else if (item.key === "dynamic-no-image") {
        controller = createDynamicHeightList(view, data, true);
      }
      controllers.set(item.label, controller);
    });
  }

  function setActive(label) {
    state.current = label;
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.textContent === label);
    });

    const views = document.querySelectorAll(".view");
    views.forEach((view) => {
      const isActive = view.dataset.label === label;
      view.classList.toggle("active", isActive);
      if (isActive) {
        const controller = controllers.get(label);
        if (controller && typeof controller.refresh === "function") {
          controller.refresh();
        }
      }
    });
  }

  function createData(total) {
    try {
      const words = [
        "virtual",
        "scroll",
        "list",
        "render",
        "buffer",
        "observer",
        "layout",
        "frame",
      ];
      return Array.from({ length: total }, (_, index) => {
        const length = 120 + (index % 350);
        return {
          index,
          text: generateText(words, length),
          image: IMAGE_LIST[index % IMAGE_LIST.length],
        };
      });
    } catch (error) {
      console.error("生成数据失败:", error);
      return [];
    }
  }

  function generateText(words, length) {
    const parts = [];
    let count = 0;
    while (count < length) {
      const word = words[count % words.length];
      parts.push(word);
      count += word.length + 1;
    }
    return parts.join(" ").slice(0, length);
  }

  function createPanel(root) {
    const panel = document.createElement("div");
    panel.className = "panel";
    root.appendChild(panel);
    return panel;
  }

  function createVirtualContainer(root, height) {
    const container = document.createElement("div");
    container.className = "virtual-scroll-list";
    container.style.height = `${height}px`;

    const scrollList = document.createElement("div");
    scrollList.className = "scroll-list";

    const renderList = document.createElement("div");
    renderList.className = "render-list";

    container.appendChild(scrollList);
    container.appendChild(renderList);
    root.appendChild(container);

    return { container, scrollList, renderList };
  }

  function createNormalList(root, data) {
    const panel = createPanel(root);
    panel.innerHTML =
      "<span>普通列表：一次性渲染全部内容</span><code>height = 450px</code>";

    const container = document.createElement("div");
    container.className = "virtual-scroll-list";
    container.style.height = "450px";

    const renderList = document.createElement("div");
    renderList.className = "render-list";
    renderList.style.position = "relative";

    const fragment = document.createDocumentFragment();
    data.forEach((item) => {
      fragment.appendChild(createDataItem(item, false));
    });
    renderList.appendChild(fragment);

    container.appendChild(renderList);
    root.appendChild(container);

    return {
      refresh() {
        // 普通列表无需刷新
      },
    };
  }

  function createStaticScrollList(root, itemHeight, itemCount, visibleHeight) {
    const panel = createPanel(root);
    panel.innerHTML =
      "<span>固定高度：scroll 事件驱动</span><code>itemHeight = 50px</code>";

    const { container, scrollList, renderList } = createVirtualContainer(
      root,
      visibleHeight
    );
    scrollList.style.height = `${itemHeight * itemCount}px`;

    const visibleCount = Math.ceil(visibleHeight / itemHeight) + 1;
    let startIndex = 0;

    function render() {
      const endIndex = Math.min(itemCount - 1, startIndex + visibleCount - 1);
      renderList.style.transform = `translateY(${startIndex * itemHeight}px)`;
      renderList.innerHTML = "";
      const fragment = document.createDocumentFragment();
      for (let i = startIndex; i <= endIndex; i += 1) {
        const item = document.createElement("div");
        item.className = "list-item";
        item.style.height = `${itemHeight}px`;
        item.style.lineHeight = `${itemHeight}px`;
        item.textContent = `${i}`;
        fragment.appendChild(item);
      }
      renderList.appendChild(fragment);
    }

    const handleScroll = throttle((event) => {
      const target = event.target;
      startIndex = Math.floor(target.scrollTop / itemHeight);
      render();
    }, 16);

    container.addEventListener("scroll", handleScroll, { passive: true });
    render();

    return {
      refresh() {
        render();
      },
    };
  }

  function createObserverList(root, itemHeight, itemCount, visibleHeight) {
    const panel = createPanel(root);
    panel.innerHTML =
      "<span>固定高度：IntersectionObserver 驱动</span><code>itemHeight = 50px</code>";

    const { container, scrollList, renderList } = createVirtualContainer(
      root,
      visibleHeight
    );
    scrollList.style.height = `${itemHeight * itemCount}px`;
    const visibleCount = Math.ceil(visibleHeight / itemHeight) + 1;
    let startIndex = 0;

    const head = document.createElement("div");
    const foot = document.createElement("div");
    head.className = "list-item";
    foot.className = "list-item";
    head.style.height = `${itemHeight}px`;
    foot.style.height = `${itemHeight}px`;

    function render() {
      const endIndex = Math.min(itemCount - 1, startIndex + visibleCount - 1);
      const topOffset = Math.max(0, startIndex - 1) * itemHeight;
      renderList.style.transform = `translateY(${topOffset}px)`;
      renderList.innerHTML = "";
      renderList.appendChild(head);
      const fragment = document.createDocumentFragment();
      for (let i = startIndex; i <= endIndex; i += 1) {
        const item = document.createElement("div");
        item.className = "list-item";
        item.style.height = `${itemHeight}px`;
        item.style.lineHeight = `${itemHeight}px`;
        item.textContent = `${i}`;
        fragment.appendChild(item);
      }
      renderList.appendChild(fragment);
      renderList.appendChild(foot);
    }

    const observer = new IntersectionObserver(
      throttle((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (entry.target === head) {
            startIndex = Math.max(0, startIndex - 1);
            render();
          } else if (entry.target === foot) {
            if (startIndex + visibleCount < itemCount) {
              startIndex += 1;
              render();
            }
          }
        });
      }, 16),
      {
        root: container,
        rootMargin: "10px",
        threshold: 0.1,
      }
    );

    observer.observe(head);
    observer.observe(foot);
    render();

    return {
      refresh() {
        render();
      },
    };
  }

  function createDynamicHeightList(root, data, noImage) {
    const panel = createPanel(root);
    panel.innerHTML =
      "<span>动态高度：测量渲染项高度并校正</span><code>buffer = 8</code>";

    const visibleHeight = 550;
    const estimateHeight = 200;
    const bufferAbove = 8;
    const bufferBelow = 8;
    const idPrefix = "item_";
    let startIndex = 0;
    let endIndex = 0;
    const records = data.map((item, index) => ({
      index,
      height: estimateHeight,
      bottom: (index + 1) * estimateHeight,
      data: item,
    }));

    if (!records.length) {
      panel.innerHTML = "<span>动态高度列表数据为空</span>";
      return {
        refresh() {
          // 空数据无需刷新
        },
      };
    }

    const { container, scrollList, renderList } = createVirtualContainer(
      root,
      visibleHeight
    );

    function updatePanel() {
      panel.innerHTML = `<span>动态高度：测量渲染项高度并校正</span><code>start = ${startIndex}</code><code>end = ${endIndex}</code>`;
    }

    function render() {
      if (!records.length) return;
      const startRecord = records[startIndex];
      const topOffset = startRecord.bottom - startRecord.height;
      renderList.style.transform = `translateY(${topOffset}px)`;
      renderList.innerHTML = "";

      const fragment = document.createDocumentFragment();
      for (let i = startIndex; i <= endIndex; i += 1) {
        fragment.appendChild(createDataItem(records[i].data, noImage, idPrefix));
      }
      renderList.appendChild(fragment);
      updatePanel();

      requestAnimationFrame(updateItemHeights);
    }

    function updateItemHeights() {
      const children = renderList.children;
      if (!children.length) return;
      let minChangedIndex = null;
      Array.from(children).forEach((element) => {
        if (!element.id) return;
        const index = Number(element.id.replace(idPrefix, ""));
        const height = element.offsetHeight;
        const record = records[index];
        if (record && record.height !== height) {
          record.height = height;
          minChangedIndex =
            minChangedIndex === null ? index : Math.min(minChangedIndex, index);
        }
      });

      if (minChangedIndex === null) {
        scrollList.style.height = `${records[records.length - 1].bottom}px`;
        return;
      }

      // 关键逻辑：从变更点开始重新计算累计高度
      for (let i = minChangedIndex; i < records.length; i += 1) {
        const prevBottom = i === 0 ? 0 : records[i - 1].bottom;
        records[i].bottom = prevBottom + records[i].height;
      }
      scrollList.style.height = `${records[records.length - 1].bottom}px`;
    }

    function findIndexByOffset(offset) {
      let left = 0;
      let right = records.length - 1;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (records[mid].bottom >= offset) {
          right = mid - 1;
        } else {
          left = mid + 1;
        }
      }
      return Math.min(left, records.length - 1);
    }

    function updateRange(scrollTop) {
      const start = findIndexByOffset(scrollTop);
      const end = findIndexByOffset(scrollTop + visibleHeight);
      startIndex = Math.max(0, start - bufferAbove);
      endIndex = Math.min(records.length - 1, end + bufferBelow);
    }

    const handleScroll = throttle((event) => {
      const target = event.target;
      updateRange(target.scrollTop);
      render();
    }, 16);

    container.addEventListener("scroll", handleScroll, { passive: true });

    updateRange(0);
    scrollList.style.height = `${records[records.length - 1].bottom}px`;
    render();

    return {
      refresh() {
        render();
      },
    };
  }

  function createDataItem(item, noImage, idPrefix) {
    const wrapper = document.createElement("div");
    wrapper.className = "list-item";
    if (idPrefix) {
      wrapper.id = `${idPrefix}${item.index}`;
    }

    const indexTag = document.createElement("span");
    indexTag.className = "index-tag";
    indexTag.textContent = item.index;
    wrapper.appendChild(indexTag);

    const text = document.createElement("div");
    text.textContent = item.text;
    wrapper.appendChild(text);

    if (!noImage) {
      const img = document.createElement("img");
      img.src = item.image;
      img.alt = `image-${item.index}`;
      wrapper.appendChild(img);
    }
    return wrapper;
  }

  function throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastCall < delay) return;
      lastCall = now;
      func.apply(this, args);
    };
  }
})();
