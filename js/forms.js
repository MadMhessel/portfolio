/* fix: маска телефона и сообщения формы */
const phoneInputs = document.querySelectorAll('input[data-mask="phone"]');
phoneInputs.forEach((input) => {
  input.addEventListener('input', () => {
    const raw = input.value.replace(/\D/g, '');
    if(!raw.length){
      input.value = '';
      return;
    }
    let digits = raw;
    if(digits.startsWith('8')){
      digits = `7${digits.slice(1)}`;
    }else if(!digits.startsWith('7')){
      digits = `7${digits}`;
    }
    digits = digits.slice(0,11);
    let formatted = '+7';
    if(digits.length > 1){
      formatted += ' (' + digits.slice(1,4);
      if(digits.length >= 4){formatted += ') ' + digits.slice(4,7);}
      if(digits.length >= 7){formatted += '-' + digits.slice(7,9);}
      if(digits.length >= 9){formatted += '-' + digits.slice(9,11);}
    }
    input.value = formatted;
  });
});

document.querySelectorAll('form[data-validate]').forEach((form) => {
  form.setAttribute('novalidate', 'true');
  const fields = Array.from(form.querySelectorAll('input, textarea, select')).filter((field) => field.name && field.type !== 'hidden');
  const getErrorContainer = (field) => form.querySelector(`[data-error-for="${field.name}"]`);
  const setFieldError = (field, message) => {
    field.setCustomValidity(message || '');
    if(message){
      field.setAttribute('aria-invalid', 'true');
    }else{
      field.removeAttribute('aria-invalid');
    }
    const errorContainer = getErrorContainer(field);
    if(errorContainer){
      errorContainer.textContent = message || '';
    }
  };
  const getFieldMessage = (field) => {
    if(field.disabled){return '';}
    const name = field.name;
    if(field.type === 'checkbox'){
      if(field.required && !field.checked){
        return name === 'consent' ? 'Подтвердите согласие на обработку данных' : 'Подтвердите выбор этого поля';
      }
      return '';
    }
    const rawValue = field.value;
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
    if(field.required && !value){
      if(name === 'name'){return 'Введите имя и фамилию';}
      if(name === 'phone'){return 'Укажите телефон для связи';}
      if(name === 'area'){return form.id === 'calc' ? 'Укажите площадь помещения' : 'Укажите площадь проекта';}
      if(name === 'level'){return 'Выберите уровень отделки';}
      return 'Заполните поле';
    }
    if(!value){
      return '';
    }
    if(name === 'phone'){
      const digits = value.replace(/\D/g, '');
      if(digits.length < 11){
        return 'Введите телефон в формате +7 (999) 000-00-00';
      }
      return '';
    }
    if(name === 'area'){
      if(field.validity.badInput){
        return 'Введите числовое значение площади';
      }
      const numericValue = Number(value);
      if(Number.isFinite(numericValue)){
        if(field.min && numericValue < Number(field.min)){
          return `Минимальная площадь — ${field.min} м²`;
        }
        if(field.step && Number(field.step) && numericValue % Number(field.step) !== 0){
          return 'Введите целое значение площади';
        }
      }
      return '';
    }
    return '';
  };
  const validateField = (field) => {
    if(!field.name){return true;}
    const message = getFieldMessage(field);
    setFieldError(field, message);
    return !message;
  };
  fields.forEach((field) => {
    const eventName = field.type === 'checkbox' || field.tagName === 'SELECT' ? 'change' : 'input';
    field.addEventListener(eventName, () => validateField(field));
    field.addEventListener('blur', () => validateField(field));
  });
  form.addEventListener('reset', () => {
    window.setTimeout(() => {
      fields.forEach((field) => setFieldError(field, ''));
    }, 0);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let firstInvalid = null;
    fields.forEach((field) => {
      const isValid = validateField(field);
      if(!isValid && !firstInvalid){
        firstInvalid = field;
      }
    });
    if(firstInvalid){
      firstInvalid.focus();
      return;
    }
    const formIdentifier = form.getAttribute('data-analytics-id') || form.id || form.getAttribute('name') || 'lead-form';
    if(Array.isArray(window.dataLayer)){
      window.dataLayer.push({event:'form_submit',formId:formIdentifier});
    }else if(typeof window.gtag === 'function'){
      window.gtag('event','form_submit',{form_id:formIdentifier});
    }
    const action = form.getAttribute('action');
    if(action){
      form.submit();
    }else{
      form.dispatchEvent(new CustomEvent('form:valid', {bubbles:true}));
    }
  });
});
