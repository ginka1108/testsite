/**
 * きみ夏宵あそび – Data Loader
 * GitHub Pages に配置された JSON を fetch して返すユーティリティ。
 * BASE_URL を変更するだけでローカル / 本番を切り替えられます。
 */

const KNY = (() => {
  // GitHub Pages の raw JSONディレクトリ（末尾スラッシュなし）
  // 例: 'https://your-org.github.io/your-repo/data'
  const BASE_URL = './data';

  /**
   * JSON をフェッチして返す。
   * @param {string} name - ファイル名（拡張子なし）
   */
  async function load(name) {
    const url = `${BASE_URL}/${name}.json`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return res.json();
  }

  /**
   * アバター要素を生成して返す。
   * avatar パスが存在する場合は <img>、なければ placeholder-div。
   */
  function avatarEl(src, initial, hue, cls = '') {
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = initial;
      img.className = cls || 'member-avatar';
      img.onerror = function () {
        const ph = placeholderEl(initial, hue, cls || 'member-avatar');
        this.replaceWith(ph);
      };
      return img;
    }
    return placeholderEl(initial, hue, cls || 'member-avatar');
  }

  function placeholderEl(initial, hue, cls = 'member-avatar') {
    const div = document.createElement('div');
    div.className = `${cls} placeholder-avatar`;
    div.style.setProperty('--hue', hue);
    div.textContent = initial;
    return div;
  }

  /** 数値を3桁カンマ区切りに */
  function num(n) {
    return Number(n).toLocaleString('ja-JP');
  }

  return { load, avatarEl, placeholderEl, num };
})();
