// 获取object 的 key，对TS类型校验友好
export function getKeys<T extends Record<string, any>>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

// 预加载图片
export function preloadImages(urls: string[]) {
  return Promise.all(
    urls.map((url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ url, success: true });
        img.onerror = () => resolve({ url, success: false });
        img.src = url;
      });
    }),
  );
}

export function getAllTiles(): string[] {
  const urls: string[] = [];
  ["hand", "out", "outh"].forEach((dir) => {
    for (let index = 1; index < 10; index++) {
      urls.push(
        `./images/tiles/${dir}/${index}m.png`,
        `./images/tiles/${dir}/${index}p.png`,
        `./images/tiles/${dir}/${index}s.png`,
      );
    }
    for (let index = 1; index < 8; index++) {
      urls.push(`./images/tiles/${dir}/${index}z.png`);
    }
    urls.push(`./images/tiles/${dir}/back.png`);
  });

  return urls;
}

export function isMobileBrowser() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    .test(navigator.userAgent);
}

export function isWeixinBrowser() {
    const ua = navigator.userAgent.toLowerCase();
    // 包含 MicroMessenger 且不包含 wxwork（企业微信）
    return /micromessenger/.test(ua) && !/wxwork/.test(ua);
}

/**
 * Fisher-Yates 洗牌算法（最优解）
 * 时间复杂度 O(n)，空间复杂度 O(1)，真正的随机均匀分布
 */
export function shuffleFisherYates(arr: any[]) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        // 生成 [0, i] 范围内的随机整数
        const j = Math.floor(Math.random() * (i + 1));
        // 交换元素
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}


/**
 * 随机整数 [0, max)
 */
export function randomInt(max: number): number {
    return Math.floor(Math.random() * max);
}