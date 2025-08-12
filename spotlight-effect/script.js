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

      lightSwitch.addEventListener("mousedown", (e) => {
        e.preventDefault();
        isDragging = true;
        hasToggled = false;
        startY = e.clientY;
        document.body.classList.add("grabbing");
        pullCord.style.transition = "none";
      });

      window.addEventListener("mousemove", (e) => {
        if (isDragging) {
          const deltaY = e.clientY - startY;
          const pullDistance = Math.max(0, deltaY);
          pullCord.style.height = `${initialCordHeight + pullDistance}px`;

          if (pullDistance > dragThreshold && !hasToggled) {
            toggleLight();
            hasToggled = true;
          }
        }
      });

      window.addEventListener("mouseup", () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.classList.remove("grabbing");
        pullCord.style.transition = "height 0.1s ease-out";
        pullCord.style.height = `${initialCordHeight}px`;
      });

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