<?php
$host = "localhost";
$user = "root"; // par défaut pour XAMPP
$password = ""; // par défaut vide
$dbname = "flow_manager";

// Créer la connexion
$conn = new mysqli($host, $user, $password, $dbname);

// Vérifier la connexion
if ($conn->connect_error) {
    die("Échec de la connexion : " . $conn->connect_error);
}

?>