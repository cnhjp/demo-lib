const overlay = document.getElementById("spotlight-overlay");
      const lightSwitch = document.getElementById("light-switch");
      const lightBulb = document.getElementById("light-bulb");
      const pullCord = document.getElementById("pull-cord");

      let isLightOn = true; // [关键改动] 初始状态为开灯
      const spotlightSize = "250px";

      let isDragging = false;
      let startY = 0;
      let hasToggled = false;
      const dragThreshold = 40;
      const initialCordHeight = 40;

      function startPull(clientY) {
        isDragging = true;
        hasToggled = false;
        startY = clientY;
        document.body.classList.add("grabbing");
        pullCord.style.transition = "none";
      }

      function movePull(clientY) {
        if (!isDragging) return;
        const deltaY = clientY - startY;
        const pullDistance = Math.max(0, deltaY);
        pullCord.style.height = `${initialCordHeight + pullDistance}px`;

        if (pullDistance > dragThreshold && !hasToggled) {
          toggleLight();
          hasToggled = true;
        }
      }

      function endPull() {
        if (!isDragging) return;
        // 如果是轻触/点击且未拉到阈值，直接切换
        if (!hasToggled) {
          toggleLight();
        }
        isDragging = false;
        document.body.classList.remove("grabbing");
        pullCord.style.transition = "height 0.1s ease-out";
        pullCord.style.height = `${initialCordHeight}px`;
      }

      // 鼠标事件
      lightSwitch.addEventListener("mousedown", (e) => {
        e.preventDefault();
        startPull(e.clientY);
      });

      window.addEventListener("mousemove", (e) => {
        if (isDragging) {
          movePull(e.clientY);
        }
      });

      window.addEventListener("mouseup", endPull);

      // 移动端 Touch 事件
      lightSwitch.addEventListener("touchstart", (e) => {
        if (e.cancelable) e.preventDefault();
        startPull(e.touches[0].clientY);
      }, { passive: false });

      window.addEventListener("touchmove", (e) => {
        if (isDragging) {
          if (e.cancelable) e.preventDefault();
          movePull(e.touches[0].clientY);
        }
        const touch = e.touches[0];
        window.requestAnimationFrame(() => {
          overlay.style.setProperty("--x", `${touch.clientX}px`);
          overlay.style.setProperty("--y", `${touch.clientY}px`);
        });
      }, { passive: false });

      window.addEventListener("touchend", endPull);

      function toggleLight() {
        isLightOn = !isLightOn;

        if (isLightOn) {
          // 开灯 -> 页面全亮
          overlay.classList.add("fully-lit");
          lightBulb.classList.add("on");
        } else {
          // 关灯 -> 进入聚光灯模式
          overlay.classList.remove("fully-lit");
          overlay.style.setProperty("--size", spotlightSize);
          lightBulb.classList.remove("on");
        }
      }

      window.addEventListener("mousemove", (e) => {
        window.requestAnimationFrame(() => {
          overlay.style.setProperty("--x", `${e.clientX}px`);
          overlay.style.setProperty("--y", `${e.clientY}px`);
        });
      });

      // [关键改动] 页面加载时，立即设置开灯状态
      overlay.classList.add("fully-lit");
      lightBulb.classList.add("on");