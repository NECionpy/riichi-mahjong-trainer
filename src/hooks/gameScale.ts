import { useEffect, useState } from "react";

const DESIGN_WIDTH = 2400;
const DESIGN_HEIGHT = 1080;

export function useGameScale() {
  const [layout, setLayout] = useState({
    scale: 1,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT, 
    originWidth: DESIGN_WIDTH,
    originHeight: DESIGN_HEIGHT,
  });

  useEffect(() => {
    const update = () => {
      // 使用 visualViewport 可以更准确地获得实际可视区域
      const viewport = window.visualViewport;

      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;

      const scale = Math.min(
        width / DESIGN_WIDTH,
        height / DESIGN_HEIGHT
      );

      setLayout({
        scale,
        originWidth: DESIGN_WIDTH,
        originHeight: DESIGN_HEIGHT,
        width: DESIGN_WIDTH * scale,
        height: DESIGN_HEIGHT * scale,
      });
    };

    update();

    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);

    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  return layout;
}