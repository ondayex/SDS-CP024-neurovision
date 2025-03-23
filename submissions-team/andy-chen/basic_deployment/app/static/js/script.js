// General application functionality
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling to all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Add responsive behavior to the page
    const checkWindowSize = () => {
        const windowWidth = window.innerWidth;
        const body = document.body;
        
        if (windowWidth <= 768) {
            body.classList.add('mobile');
        } else {
            body.classList.remove('mobile');
        }
    };
    
    // Check window size on load and resize
    checkWindowSize();
    window.addEventListener('resize', checkWindowSize);
}); 