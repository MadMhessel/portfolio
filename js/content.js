document.addEventListener('DOMContentLoaded', function() {
    fetch('data/home.json')
        .then(response => response.json())
        .then(data => {
            document.querySelector('.hero .subtitle').textContent = data.hero_subtitle;
            document.querySelector('.hero h1').textContent = data.hero_title;
            document.querySelector('.hero p').textContent = data.hero_paragraph;
            document.querySelector('.hero .btn-primary').textContent = data.cta_text;
        });

    fetch('data/projects.json')
        .then(response => response.json())
        .then(data => {
            const projectsGrid = document.querySelector('.portfolio-grid');
            projectsGrid.innerHTML = ''; // Clear existing projects
            data.forEach(project => {
                const projectCard = `
                    <article class="card reveal-in" role="listitem">
                        <a class="card-link" href="${project.url}" rel="bookmark" aria-label="${project.title} — подробнее">
                            <div class="thumb">
                                <picture>
                                    <img src="${project.image}" width="960" height="640" alt="${project.alt}" loading="lazy" decoding="async" data-no-upscale>
                                </picture>
                            </div>
                            <div>
                                <h3 class="card-title">${project.title}</h3>
                                <p class="card-meta">${project.meta}</p>
                            </div>
                        </a>
                    </article>
                `;
                projectsGrid.innerHTML += projectCard;
            });

            // Let other scripts know that new content has been added
            const event = new Event('new-content-added');
            document.dispatchEvent(event);
        });
});