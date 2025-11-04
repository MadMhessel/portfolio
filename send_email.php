<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Load Composer's autoloader (if using Composer)
// require 'vendor/autoload.php';
// If not using Composer, manually include the files
require 'phpmailer/src/Exception.php';
require 'phpmailer/src/PHPMailer.php';
require 'phpmailer/src/SMTP.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Function to sanitize input
    function sanitize_input($data) {
        $data = trim($data);
        $data = stripslashes($data);
        $data = htmlspecialchars($data);
        return $data;
    }

    // Retrieve and sanitize form data
    $name = isset($_POST["name"]) ? sanitize_input($_POST["name"]) : "Не указано";
    $phone = isset($_POST["phone"]) ? sanitize_input($_POST["phone"]) : "Не указано";
    $area = isset($_POST["area"]) ? sanitize_input($_POST["area"]) : "Не указано";
    $city = isset($_POST["city"]) ? sanitize_input($_POST["city"]) : "Не указано";
    $comment = isset($_POST["comment"]) ? sanitize_input($_POST["comment"]) : "Нет";
    $consent = isset($_POST["consent"]) ? "Да" : "Нет";

    // Basic validation
    if (empty($name) || empty($phone) || $consent !== "Да") {
        // Handle error - required fields missing
        http_response_code(400);
        echo "Пожалуйста, заполните все обязательные поля.";
        exit;
    }

    // Create an instance; passing `true` enables exceptions
    $mail = new PHPMailer(true);

    try {
        // Server settings
        $mail->SMTPDebug = SMTP::DEBUG_OFF;                      // Enable verbose debug output (0 for off, 2 for client and server)
        $mail->isSMTP();                                         // Send using SMTP
        $mail->Host       = 'mail.hosting.reg.ru';               // Set the SMTP server to send through
        $mail->SMTPAuth   = true;                                // Enable SMTP authentication
        $mail->Username   = 'atmstr-portfolio@atmstr-portfolio.ru'; // SMTP username
        $mail->Password   = '01020304atmstr-portfolio';          // SMTP password
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;         // Enable implicit TLS encryption
        $mail->Port       = 465;                                 // TCP port to connect to; use 587 if `SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS`

        // Recipients
        $mail->setFrom('atmstr-portfolio@atmstr-portfolio.ru', 'Сайт Atmosphere');
        $mail->addAddress('crazymhessel@gmail.com', 'Получатель'); // Add a recipient
        $mail->addReplyTo('atmstr-portfolio@atmstr-portfolio.ru', 'Сайт Atmosphere');

        // Content
        $mail->isHTML(false);                                    // Set email format to plain text
        $mail->Subject = "Новая заявка с сайта Atmosphere";
        $email_content = "Новая заявка с сайта Atmosphere:\n\n";
        $email_content .= "Имя: " . $name . "\n";
        $email_content .= "Телефон: " . $phone . "\n";
        $email_content .= "Площадь: " . $area . " м²\n";
        $email_content .= "Город: " . $city . "\n\n";
        $email_content .= "Комментарий:\n" . $comment . "\n\n";
        $email_content .= "Согласие на обработку данных: " . $consent . "\n";
        $mail->Body    = $email_content;
        $mail->CharSet = 'UTF-8';

        $mail->send();
        // Redirect to the thank you page on success
        header("Location: thanks.html?success=1");
        exit;
    } catch (Exception $e) {
        // Redirect to an error page or the same page with an error message
        header("Location: thanks.html?success=0&error=" . urlencode($mail->ErrorInfo));
        exit;
    }
} else {
    // If not a POST request, redirect to the homepage
    header("Location: index.html");
    exit;
}
?>