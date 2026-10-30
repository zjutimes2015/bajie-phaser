/**
 * 微信可选桥：浏览器里 mock 广告/分享；有 wx 时调真实 API。
 * adUnitId 仍需你在微信后台填；这里只留接口。
 */

export interface WxLike {
  showToast?: (o: { title: string; icon?: string }) => void;
  shareAppMessage?: (o: { title: string; imageUrl?: string }) => void;
  createRewardedVideoAd?: (o: { adUnitId: string }) => {
    show: () => Promise<void>;
    load: () => Promise<void>;
    onClose: (cb: (r: { isEnded: boolean }) => void) => void;
    onError: (cb: (e: unknown) => void) => void;
  };
}

declare global {
  interface Window {
    wx?: WxLike;
  }
}

const AD_UNIT = ''; // 正式流量主 id 以后填

export function shareText(title: string): void {
  if (typeof window !== 'undefined' && window.wx?.shareAppMessage) {
    window.wx.shareAppMessage({ title });
    return;
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(title);
  }
  console.info('[share mock]', title);
}

/** 激励视频：有 wx+adUnit 走真广告；否则 1.2s mock 成功。 */
export function playRewardedAd(): Promise<boolean> {
  const wx = typeof window !== 'undefined' ? window.wx : undefined;
  if (wx?.createRewardedVideoAd && AD_UNIT) {
    return new Promise((resolve) => {
      const ad = wx.createRewardedVideoAd!({ adUnitId: AD_UNIT });
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      ad.onClose((r) => finish(!!r.isEnded));
      ad.onError(() => finish(false));
      ad.load()
        .then(() => ad.show())
        .catch(() => finish(false));
    });
  }
  return new Promise((resolve) => {
    console.info('[ad mock] playing…');
    setTimeout(() => resolve(true), 1200);
  });
}
