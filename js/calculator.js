/* fix: калькулятор сметы */
const calculatorForm = document.getElementById('calc');

if(calculatorForm){
  const areaInput = calculatorForm.querySelector('#calcArea');
  const levelSelect = calculatorForm.querySelector('#calcLevel');
  const resultNode = document.getElementById('calcResult');
  if(areaInput && levelSelect && resultNode){
    const baseMessage = 'Введите площадь и выберите уровень отделки, чтобы увидеть расчёт.';
    const currencyFormatter = new Intl.NumberFormat('ru-RU', {style:'currency', currency:'RUB', maximumFractionDigits:0});
    const showMessage = (message) => {
      resultNode.textContent = message;
    };
    const calculate = () => {
      const areaValue = Number(areaInput.value);
      const rateValue = Number(levelSelect.value);
      if(!Number.isFinite(areaValue) || areaValue < 1){
        showMessage('Введите площадь не менее 1 м², чтобы увидеть ориентировочную стоимость.');
        return false;
      }
      if(!Number.isFinite(rateValue) || rateValue <= 0){
        showMessage('Выберите уровень отделки, чтобы получить расчёт.');
        return false;
      }
      const total = Math.round(areaValue * rateValue);
      if(!Number.isFinite(total) || total <= 0){
        showMessage('Введите корректные данные для расчёта.');
        return false;
      }
      showMessage(`Ориентировочная смета: ${currencyFormatter.format(total)}`);
      return true;
    };
    const handleLiveUpdate = () => {
      if(!areaInput.value && !levelSelect.value){
        showMessage(baseMessage);
        return;
      }
      calculate();
    };
    areaInput.addEventListener('input', handleLiveUpdate);
    levelSelect.addEventListener('change', handleLiveUpdate);
    calculatorForm.addEventListener('form:valid', () => {
      calculate();
    });
    calculatorForm.addEventListener('reset', () => {
      window.setTimeout(() => showMessage(baseMessage), 0);
    });
  }
}
