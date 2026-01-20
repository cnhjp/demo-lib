const setAllGrayBtn = document.querySelector("#set-all-gray"),
  setFirstGrayBtn = document.querySelector("#set-first-gray"),
  setPartialGrayBtn = document.querySelector("#set-partial-gray"),
  resetBtn = document.querySelector("#reset");
const app = document.querySelector("#app");
const gridWrapper = document.querySelector("#grid-wrapper");

setAllGrayBtn && setAllGrayBtn.addEventListener("click", toggleAllGray);
setFirstGrayBtn && setFirstGrayBtn.addEventListener("click", toggleFirstGray);
setPartialGrayBtn &&
  setPartialGrayBtn.addEventListener("click", togglePartialGray);
resetBtn && resetBtn.addEventListener("click", reset);

/**
 * 重置所有
 */
function reset() {
  location.reload();
}

/**
 * 切换全部置灰
 */
function toggleAllGray() {
  const htmlElement = document.documentElement;
  if (htmlElement.classList.contains("global-gray")) {
    htmlElement.classList.remove("global-gray");
  } else {
    htmlElement.classList.add("global-gray");
  }
}

/**
 * 切换首屏置灰
 */
function toggleFirstGray() {
  const htmlElement = document.documentElement;
  if (htmlElement.classList.contains("first-gray")) {
    htmlElement.classList.remove("first-gray");
  } else {
    htmlElement.classList.add("first-gray");
  }
}

/**
 * 切换部分置灰
 */
function togglePartialGray() {
  const htmlElement = document.documentElement;
  if (htmlElement.classList.contains("partial-gray")) {
    htmlElement.classList.remove("partial-gray");
    return;
  } else {
    htmlElement.classList.add("partial-gray");
  }
  const noGrayElements = document.querySelectorAll(".no-gray");
  // 给从根节点到noGray节点路径上的所有节点添加noGray标记
  for (const el of noGrayElements) {
    // 添加totalNoGray标记，表示在遍历到该节点时不再往下遍历
    el.classList.add("total-no-gray");
    let node = el;
    while (node) {
      node.classList.add("no-gray");
      node = node.parentElement;
    }
  }
  // 从根节点开始往下遍历，对于没做noGray标记的
  dfs(htmlElement);

  /**
   * 递归遍历给节点做标记
   * @param {HTMLElement} node
   * @returns
   */
  function dfs(node) {
    if (!node || node.classList.contains("total-no-gray")) return;
    if (node.classList.contains("no-gray")) {
      for (const child of node.children) {
        dfs(child);
      }
    } else {
      node.classList.add("gray");
    }
  }
}

// 动态添加grid，形状为九宫格；最中间那个也是九宫格
/**
 * 创建图片
 * @param {number} width
 * @param {number} height
 * @param {'重要' | '普通'} text
 * @returns
 */
function createRandomImage(width, height, text) {
  const bgColor = {
    重要: "f56c6c",
    普通: "409eff",
  }[text];
  const src = `https://dummyimage.com/${width}x${height}/${bgColor}/ffffff.jpg&text=${text}`;
  const img = new Image();
  img.src = src;
  return img;
}

/**
 * 生成九宫格元素
 * @param {number} imgSideLength
 * @param {Array<'重要' | '普通' | Array<Self>>} gridContents
 * @returns
 */
function generateNineSquareGrid(imgSideLength, gridContents) {
  const grid = document.createElement("div");
  grid.classList.add("grid");
  for (const content of gridContents) {
    const gridItem = document.createElement("div");
    gridItem.classList.add("grid-item");
    if (content === "重要") {
      gridItem.classList.add("no-gray");
      gridItem.appendChild(
        createRandomImage(imgSideLength, imgSideLength, "重要")
      );
    } else if (content === "普通") {
      gridItem.appendChild(
        createRandomImage(imgSideLength, imgSideLength, "普通")
      );
    } else if (Array.isArray(content)) {
      gridItem.appendChild(
        generateNineSquareGrid(imgSideLength / 3 - 10, content)
      );
    }
    grid.appendChild(gridItem);
  }
  return grid;
}

if (!gridWrapper) {
  console.error("初始化失败：未找到 #grid-wrapper 容器。");
} else {
  // 生成并挂载九宫格
  const grid = generateNineSquareGrid(gridWrapper.clientWidth / 3 - 20, [
    "重要",
    "普通",
    "重要",
    "普通",
    ["普通", "重要", "重要", "普通", "普通", "普通", "普通", "普通", "重要"],
    "普通",
    "重要",
    "重要",
    "重要",
  ]);

  gridWrapper.appendChild(grid);
}

