<?php
session_start();

header('Content-Type: application/json');

require 'connexion.php';

$method = $_SERVER['REQUEST_METHOD'];
$type = $_GET['type'] ?? ''; 


// ==========================================
// AUTHENTIFICATION
// ==========================================

if ($method === 'POST' && $type === 'login') {
    $input = json_decode(file_get_contents("php://input"), true);
    $email = $conn->real_escape_string($input['email'] ?? '');
    $password = $input['password'] ?? '';

    $res = $conn->query("SELECT * FROM utilisateurs WHERE email = '$email'");
    if ($res && $res->num_rows > 0) {
        $user = $res->fetch_assoc();
        
        if (password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id_user'];
            $_SESSION['role'] = $user['role'];
            echo json_encode(["status" => "success"]);
            exit;
        } else {
            echo json_encode(["status" => "error", "message" => "Mot de passe incorrect"]);
            exit;
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Email introuvable"]);
        exit;
    }
}

if ($method === 'POST' && $type === 'register') {
    $input = json_decode(file_get_contents("php://input"), true);
    $email = $conn->real_escape_string($input['email'] ?? '');
    $password_clair = $input['password'] ?? '';

    if (empty($email) || empty($password_clair)) {
        echo json_encode(["status" => "error", "message" => "L'email et le mot de passe sont obligatoires."]);
        exit;
    }

    $password_hashe = password_hash($password_clair, PASSWORD_DEFAULT);

    $sql = "INSERT INTO utilisateurs (email, password) VALUES ('$email', '$password_hashe')";

    if ($conn->query($sql)) {
        echo json_encode(["status" => "success", "message" => "Compte créé avec succès !"]);
    } else {
        if ($conn->errno == 1062) {
             echo json_encode(["status" => "error", "message" => "Cet email est déjà utilisé."]);
        } else {
             echo json_encode(["status" => "error", "message" => "Erreur lors de la création : " . $conn->error]);
        }
    }
    exit;
}

if ($method === 'GET' && $type === 'logout') {
    session_destroy();
    echo json_encode(["status" => "success"]);
    exit;
}

if ($method === 'GET' && $type === 'get_user_role') {
    echo json_encode(["role" => $_SESSION['role'] ?? 'guest']);
    exit;
}


// ==========================================
// CONTRÔLE D'ACCÈS
// ==========================================

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "unauthorized"]);
    exit;
}

if ($type === 'utilisateurs' && $_SESSION['role'] !== 'admin') {
    echo json_encode(["status" => "forbidden", "message" => "Accès réservé aux administrateurs."]);
    exit;
}


// ==========================================
// LECTURE (GET)
// ==========================================

if ($method === 'GET') {
    $sql = "";

    if ($type === 'stats') {
        $resCA = $conn->query("SELECT SUM(montant_ht) as total FROM factures WHERE statut_paiement = 'Payée'");
        $ca = $resCA->fetch_assoc()['total'] ?? 0;

        $resProjets = $conn->query("SELECT COUNT(*) as nb FROM projets WHERE statut = 'En cours'");
        $projets = $resProjets->fetch_assoc()['nb'] ?? 0;

        $resAttente = $conn->query("SELECT SUM(montant_ht) as total FROM factures WHERE statut_paiement = 'Impayée' OR statut_paiement = 'En attente'");
        $montantAttente = $resAttente->fetch_assoc()['total'] ?? 0;

        echo json_encode([
            "ca" => floatval($ca),
            "projets" => intval($projets),
            "attente" => floatval($montantAttente)
        ]);
        exit;
    }

    switch ($type) {
        case 'depenses':
            $sql = "SELECT * FROM depenses ORDER BY date_depense DESC";
            break;
        case 'projets':
            $sql = "SELECT * FROM projets ORDER BY id_projet DESC";
            break;
        case 'clients':
            $sql = "SELECT * FROM clients ORDER BY nom ASC";
            break;
        case 'factures':
            $sql = "SELECT * FROM factures ORDER BY date_echeance DESC";
            break;
        case 'utilisateurs':
            $sql = "SELECT id_user, email, role FROM utilisateurs ORDER BY id_user DESC";
            break;
        default:
            echo json_encode(["error" => "Type de données non reconnu"]);
            exit;
    }
    
    $result = $conn->query($sql);
    $data = [];

    if ($result) {
        while($row = $result->fetch_assoc()) { 
            $data[] = $row; 
        }
        echo json_encode($data);
    } else {
        echo json_encode(["error" => "Erreur lors de la récupération : " . $conn->error]);
    }
} 


// ==========================================
// CRÉATION (POST)
// ==========================================

elseif ($method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    $sql = "";

    if ($type === 'depenses') {
        $nature = $conn->real_escape_string($input['nature'] ?? '');
        $montant = floatval($input['montant'] ?? 0);
        $date = $conn->real_escape_string($input['date'] ?? '');
        
        $sql = "INSERT INTO depenses (nature, montant, date_depense) VALUES ('$nature', '$montant', '$date')";
    } 
    elseif ($type === 'clients') {
        $nom = $conn->real_escape_string($input['nom'] ?? '');
        $email = $conn->real_escape_string($input['email'] ?? '');
        $projet = $conn->real_escape_string($input['projet'] ?? '');
        
        $sql = "INSERT INTO clients (nom, email, projet) VALUES ('$nom', '$email', '$projet')";
    }
    elseif ($type === 'factures') {
        $client = intval($input['client'] ?? 0);
        $montant = floatval($input['montant'] ?? 0);
        $tva = floatval($input['tva'] ?? 20.00);
        $statut = $conn->real_escape_string($input['statut'] ?? 'En attente');
        $echeance = $conn->real_escape_string($input['echeance'] ?? '');
        
        $sql = "INSERT INTO factures (id_client, montant_ht, tva, statut_paiement, date_echeance) 
                VALUES ($client, $montant, $tva, '$statut', '$echeance')";
    }
    elseif ($type === 'projets') {
        $nom = $conn->real_escape_string($input['nom_projet'] ?? '');
        $id_client = intval($input['id_client'] ?? 0);
        $statut = $conn->real_escape_string($input['statut'] ?? 'En cours');
        $budget = floatval($input['budget'] ?? 0);
        $commentaires = $conn->real_escape_string($input['Commentaires'] ?? '');
        
        $sql = "INSERT INTO projets (id_client, nom_projet, statut, budget, Commentaires) 
                VALUES ($id_client, '$nom', '$statut', '$budget', '$commentaires')";
    }
    elseif ($type === 'utilisateurs') {
        $email = $conn->real_escape_string($input['email'] ?? '');
        $password_clair = $input['password'] ?? '';

        if (!empty($email) && !empty($password_clair)) {
            $password_hashe = password_hash($password_clair, PASSWORD_DEFAULT);
            $sql = "INSERT INTO utilisateurs (email, password) VALUES ('$email', '$password_hashe')";
        } else {
            echo json_encode(["status" => "error", "message" => "L'email et le mot de passe sont obligatoires."]);
            exit;
        }
    }

    if (!empty($sql)) {
        if ($conn->query($sql)) {
            echo json_encode(["status" => "success"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Erreur MySQL : " . $conn->error]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Aucune requête générée pour le type : $type"]);
    }
}


// ==========================================
// MODIFICATION (PUT)
// ==========================================

if ($method === 'PUT') {
    $input = json_decode(file_get_contents("php://input"), true);
    $id = intval($_GET['id'] ?? 0);
    $sql = "";

    if ($id > 0) {
        if ($type === 'depenses') {
            $nature = $conn->real_escape_string($input['nature'] ?? '');
            $montant = floatval($input['montant'] ?? 0);
            $date = $conn->real_escape_string($input['date'] ?? '');
            $sql = "UPDATE depenses SET nature='$nature', montant='$montant', date_depense='$date' WHERE id_depense=$id";
        } 
        elseif ($type === 'clients') {
            $nom = $conn->real_escape_string($input['nom'] ?? '');
            $email = $conn->real_escape_string($input['email'] ?? '');
            $projet = $conn->real_escape_string($input['projet'] ?? '');
            $sql = "UPDATE clients SET nom='$nom', email='$email', projet='$projet' WHERE id_client=$id";
        } 
        elseif ($type === 'factures') {
            $client = intval($input['client'] ?? 0);
            $montant = floatval($input['montant'] ?? 0);
            $tva = floatval($input['tva'] ?? 20.00);
            $statut = $conn->real_escape_string($input['statut'] ?? 'En attente');
            $echeance = $conn->real_escape_string($input['echeance'] ?? '');
            
            $sql = "UPDATE factures SET id_client=$client, montant_ht=$montant, tva=$tva, statut_paiement='$statut', date_echeance='$echeance' WHERE id_facture=$id";
        }
        elseif ($type === 'projets') {
            $nom = $conn->real_escape_string($input['nom_projet'] ?? '');
            $id_client = intval($input['id_client'] ?? 0);
            $statut = $conn->real_escape_string($input['statut'] ?? 'En cours');
            $budget = floatval($input['budget'] ?? 0);
            $commentaires = $conn->real_escape_string($input['Commentaires'] ?? '');
            
            $sql = "UPDATE projets SET nom_projet='$nom', id_client=$id_client, statut='$statut', budget='$budget', Commentaires='$commentaires' WHERE id_projet=$id";
        }

        if (!empty($sql) && $conn->query($sql)) {
            echo json_encode(["status" => "success"]);
        } else {
            echo json_encode(["status" => "error", "message" => $conn->error]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "ID invalide pour la modification"]);
    }
    exit;
}


// ==========================================
// SUPPRESSION (DELETE)
// ==========================================

if ($method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);

    if ($id > 0) {
        $table = "";
        $column = "";

        if ($type === 'clients') { 
            $table = "clients"; 
            $column = "id_client"; 
        } elseif ($type === 'depenses') { 
            $table = "depenses"; 
            $column = "id_depense"; 
        } elseif ($type === 'factures') { 
            $table = "factures"; 
            $column = "id_facture"; 
        } elseif ($type === 'projets') { 
            $table = "projets"; 
            $column = "id_projet"; 
        } elseif ($type === 'utilisateurs') { 
            $table = "utilisateurs"; 
            $column = "id_user"; 
        }

        if ($table !== "" && $column !== "") {
            $sql = "DELETE FROM $table WHERE $column = $id";
            if ($conn->query($sql)) {
                echo json_encode(["status" => "success"]);
            } else {
                echo json_encode(["status" => "error", "message" => $conn->error]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "Type non reconnu pour la suppression."]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "ID invalide."]);
    }
    exit;
}

$conn->close();
?>
