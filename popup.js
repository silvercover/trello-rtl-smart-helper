document.addEventListener('DOMContentLoaded', function() {
    const reprocessBtn = document.getElementById('reprocess');
    
    reprocessBtn.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: reprocessExtension
            });
        });
        
        // Visual feedback
        const originalText = reprocessBtn.innerHTML;
        reprocessBtn.innerHTML = '<span class="icon">✅</span>Completed';
        reprocessBtn.disabled = true;
        
        setTimeout(() => {
            reprocessBtn.innerHTML = originalText;
            reprocessBtn.disabled = false;
        }, 2000);
    });
});

// Function that will be injected into the page
function reprocessExtension() {
    if (window.trelloRTLHelper) {
        window.trelloRTLHelper.reprocessAll();
        console.log('🔄 Reprocessing completed');
    } else {
        // Initialize if not exists
        if (typeof TrelloRTLHelper !== 'undefined') {
            window.trelloRTLHelper = new TrelloRTLHelper();
            console.log('🚀 Trello RTL Helper initialized');
        }
    }
}
