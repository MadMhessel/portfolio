<?php
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

    // Email details
    $to = "crazymhessel@gmail.com";
    $subject = "Новая заявка с сайта Atmosphere";
    
    // Use the verified mail domain for the From address
    $from_email = "noreply@atmstr-portfolio.ru";

    $headers = "From: " . $from_email . "
" .
               "Reply-To: " . $to . "
" .
               "Content-Type: text/plain; charset=UTF-8" . "
" .
               "X-Mailer: PHP/" . phpversion();

    // Email body
    $email_content = "Новая заявка с сайта Atmosphere:

";
    $email_content .= "Имя: " . $name . "
";
    $email_content .= "Телефон: " . $phone . "
";
    $email_content .= "Площадь: " . $area . " м²
";
    $email_content .= "Город: " . $city . "

";
    $email_content .= "Комментарий:
" . $comment . "

";
    $email_content .= "Согласие на обработку данных: " . $consent . "
";

    // Send the email
    if (mail($to, $subject, $email_content, $headers)) {
        // Redirect to the thank you page on success
        header("Location: thanks.html?success=1");
        exit;
    } else {
        // Redirect to an error page or the same page with an error message
        // For simplicity, redirecting to thanks page with a failure flag
        header("Location: thanks.html?success=0");
        exit;
    }
} else {
    // If not a POST request, redirect to the homepage
    header("Location: index.html");
    exit;
}
?>