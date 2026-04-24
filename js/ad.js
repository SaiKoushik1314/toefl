/* =============================================
   TOEFL Prep Hub – Ad Management (Shared)
   Replace the placeholder logic below with your
   actual Google IMA SDK or AdSense video tags.
   ============================================= */

/**
 * Ad slot configuration.
 * Replace these with your real AdSense publisher ID and slot IDs.
 */
const AD_CONFIG = {
    publisherId: 'ca-pub-XXXXXXXXXXXXXXXXX',   // Replace with your AdSense pub ID
    bannerSlotTop: '1234567890',               // Top leaderboard slot
    bannerSlotSidebar: '0987654321',           // Sidebar rectangle slot
    videoAdTag: '',                            // Google IMA VAST tag URL
  };
  
  /**
   * Initialize AdSense banner ads.
   * Call this once the DOM is ready.
   * Currently uses placeholder divs — replace with real AdSense script tags.
   */
  function initBannerAds() {
    // When you have your AdSense account approved, replace the .ad-banner
    // placeholder divs in each HTML file with the standard AdSense <ins> tag:
    //
    // <ins class="adsbygoogle"
    //   style="display:block"
    //   data-ad-client="ca-pub-XXXXXXXXXXXXXXXXX"
    //   data-ad-slot="1234567890"
    //   data-ad-format="auto"
    //   data-full-width-responsive="true">
    // </ins>
    // <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    console.log('[AdManager] Banner ad slots ready for AdSense insertion.');
  }
  
  /**
   * Show a video ad overlay with a countdown.
   * @param {number} duration - Ad duration in seconds (default: 30)
   * @param {Function} onComplete - Callback when ad finishes or is skipped
   * @param {number} skipAfter - Seconds before skip button appears (default: 5)
   */
  function showVideoAdOverlay(duration = 30, onComplete = () => {}, skipAfter = 5) {
    const overlay = document.getElementById('videoAd');
    if (!overlay) { onComplete(); return; }
  
    overlay.style.display = 'flex';
  
    // In production: initialize Google IMA SDK here
    // Example:
    // const adDisplayContainer = new google.ima.AdDisplayContainer(adContainer, videoElement);
    // const adsLoader = new google.ima.AdsLoader(adDisplayContainer);
    // adsLoader.addEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, onAdsManagerLoaded, false);
    // adsLoader.requestAds(adsRequest);
  
    let remaining = duration;
    const countdown = document.getElementById('adCountdown');
    const skipBtn = document.getElementById('skipBtn');
    if (countdown) countdown.textContent = remaining;
    if (skipBtn) skipBtn.classList.remove('visible');
  
    const interval = setInterval(() => {
      remaining--;
      if (countdown) countdown.textContent = remaining;
      if (skipBtn && remaining <= skipAfter) skipBtn.classList.add('visible');
      if (remaining <= 0) {
        clearInterval(interval);
        closeVideoAd(overlay, onComplete);
      }
    }, 1000);
  
    overlay._interval = interval;
    overlay._onComplete = onComplete;
  }
  
  /**
   * Close the video ad overlay.
   */
  function closeVideoAd(overlay, cb) {
    if (!overlay) overlay = document.getElementById('videoAd');
    if (overlay._interval) clearInterval(overlay._interval);
    overlay.style.display = 'none';
    if (typeof cb === 'function') cb();
    else if (typeof overlay._onComplete === 'function') overlay._onComplete();
  }
  
  // Expose closeAd globally for onclick handlers
  window.closeAd = function() {
    closeVideoAd(document.getElementById('videoAd'));
  };
  
  // Auto-init banners on page load
  document.addEventListener('DOMContentLoaded', initBannerAds);