<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$to = "crazymhessel@gmail.com";
$subject = "Тестовое письмо с сайта atmstr-portfolio.ru";
$message = "Если вы получили это письмо, значит, функция mail() на хостинге reg.ru работает.";
$headers = "From: noreply@atmstr-portfolio.ru";

echo "Отправка тестового письма на " . $to . "...<br><br>";

if (mail($to, $subject, $message, $headers)) {
    echo "<b>Результат:</b> Письмо успешно отправлено. Проверьте ваш почтовый ящик (и папку 'Спам').";
} else {
    echo "<b>Результат:</b> Ошибка при отправке письма.";
    $error = error_get_last();
    if ($error) {
        echo "<br>Последняя ошибка сервера: " . $error['message'];
    }
}
?>