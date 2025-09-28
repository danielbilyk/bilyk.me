// Reusable footer component
function createFooter() {
    return `
        <footer class="site-footer fade-in">
            <hr class="section-divider">
            <p class="footer-credits"><a href="https://github.com/danielbilyk/bilyk.me" target="_blank" rel="noopener" class="hover-link">(Vibe)coded</a> with 🖤 in Berlin · Design and illustrations by <a href="https://malinko.design/competence" target="_blank" rel="noopener" class="hover-link">Denis Malinko</a> · 🇺🇦 <a href="https://u24.gov.ua/" target="_blank" rel="noopener" class="hover-link">Support Ukraine</a></p>
        </footer>
    `;
}

// Insert footer into the page
document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.container');
    if (container) {
        container.insertAdjacentHTML('beforeend', createFooter());
    }
});
