if (document.querySelector('.gallery')) {
  import('https://unpkg.com/photoswipe@5/dist/photoswipe-lightbox.esm.js')
    .then(({ default: PhotoSwipeLightbox }) => {
      const lightbox = new PhotoSwipeLightbox({
        gallery: '.gallery',
        children: 'self',
        pswpModule: () => import('https://unpkg.com/photoswipe@5/dist/photoswipe.esm.js')
      });
      lightbox.init();
    })
    .catch((error) => {
      console.error('Не удалось загрузить модуль PhotoSwipe', error);
    });
}
