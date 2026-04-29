document.addEventListener('DOMContentLoaded', () => {
    let typeData = "";

    const apiBase = window.location.pathname.includes('/pages/') ? '../traitement.php' : './traitement.php';


    // ==========================================
    // AUTHENTIFICATION & RÔLES
    // ==========================================

    function checkAuth(data) {
        if (data && data.status === "unauthorized") {
            const loginPage = window.location.pathname.includes('/pages/') ? 'connexion.html' : 'pages/connexion.html';
            window.location.href = loginPage;
            throw new Error("Non autorisé, redirection...");
        }
        return data;
    }

    fetch(apiBase + '?type=get_user_role')
        .then(res => res.json())
        .then(data => {
            const role = data.role;
            const adminLink = document.getElementById('link-admin');

            if (adminLink && role !== 'admin') {
                adminLink.style.display = 'none';
            }

            if (document.title.includes("Utilisateurs") && role !== 'admin') {
                window.location.href = "../index.html";
            }
        });

    if (document.title.includes("Connexion")) {
        const loginForm = document.getElementById('login-form');
        const errorMsg = document.getElementById('login-error');

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            fetch('../traitement.php?type=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    window.location.href = "../index.html";
                } else {
                    errorMsg.style.display = "block";
                    errorMsg.textContent = data.message;
                }
            })
            .catch(err => console.error("Erreur de connexion :", err));
        });
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            fetch(apiBase + '?type=logout')
                .then(res => res.json())
                .then(data => {
                    if (data.status === "success") {
                        const loginPage = window.location.pathname.includes('/pages/') ? 'connexion.html' : 'pages/connexion.html';
                        window.location.href = loginPage;
                    }
                });
        });
    }


    // ==========================================
    // DÉTECTION DU TYPE DE PAGE
    // ==========================================

    if (document.title.includes("Dépenses")) typeData = "depenses";
    else if (document.title.includes("Clients")) typeData = "clients";
    else if (document.title.includes("Factures")) typeData = "factures";
    else if (document.title.includes("Projet")) typeData = "projets";
    else if (document.title.includes("Utilisateurs")) typeData = "utilisateurs";

    const apiPath = `${apiBase}?type=${typeData}`;


    // ==========================================
    // DASHBOARD
    // ==========================================

    if (!document.title.includes("Connexion") && (document.title.includes("Dashboard") || !typeData)) {
        const caElement = document.getElementById('ca-total');
        const projetsElement = document.getElementById('projets-actifs');
        const attenteElement = document.getElementById('montant-attente');
        const chartCanvas = document.getElementById('revenueChart');

        fetch(`${apiBase}?type=stats`)
            .then(res => res.json())
            .then(checkAuth)
            .then(data => {
                if (caElement) caElement.textContent = data.ca.toLocaleString('fr-FR') + " €";
                if (projetsElement) projetsElement.textContent = data.projets;
                if (attenteElement) attenteElement.textContent = data.attente.toLocaleString('fr-FR') + " €";

                if (chartCanvas) {
                    new Chart(chartCanvas, {
                        type: 'doughnut',
                        data: {
                            labels: ['Encaissé', 'En attente'],
                            datasets: [{
                                data: [data.ca, data.attente],
                                backgroundColor: ['#4caf50', '#ff9800'],
                                borderWidth: 0,
                                hoverOffset: 4
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: { font: { size: 14 } }
                                }
                            }
                        }
                    });
                }
            })
            .catch(err => console.error("Erreur stats:", err));
    }


    // ==========================================
    // FORMULAIRE (AFFICHAGE & SOUMISSION)
    // ==========================================

    const toggleBtn = document.getElementById('toggle-form');
    const formSection = document.getElementById('add-form-section');

    if (toggleBtn && formSection) {
        toggleBtn.addEventListener('click', () => {
            const isHidden = formSection.hasAttribute('hidden');
            if (isHidden) {
                formSection.removeAttribute('hidden');
                toggleBtn.textContent = "Annuler";
                toggleBtn.classList.add('btn-cancel');
            } else {
                formSection.setAttribute('hidden', '');
                if (document.title.includes("Factures")) toggleBtn.textContent = "+ Ajouter une facture";
                else if (document.title.includes("Clients")) toggleBtn.textContent = "+ Ajouter un client";
                else if (document.title.includes("Projet")) toggleBtn.textContent = "+ Ajouter un projet";
                else if (document.title.includes("Utilisateurs")) toggleBtn.textContent = "+ Ajouter un utilisateur";
                else toggleBtn.textContent = "+ Ajouter une dépense";
                toggleBtn.classList.remove('btn-cancel');
            }
        });
    }

    const mainForm = document.querySelector('form');
    const submitBtn = mainForm ? mainForm.querySelector('button[type="submit"]') : null;
    if (submitBtn) submitBtn.classList.add('btn-primary');

    if (mainForm && typeData && !document.title.includes("Connexion")) {
        mainForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const fields = mainForm.querySelectorAll('input:not([type="submit"]), select, textarea');
            let bodyData = {};

            if (typeData === "depenses") bodyData = { nature: fields[0].value, montant: fields[1].value, date: fields[2].value };
            else if (typeData === "clients") bodyData = { nom: fields[0].value, email: fields[1].value, projet: fields[2].value };
            else if (typeData === "factures") bodyData = { client: fields[0].value, montant: fields[1].value, tva: fields[2].value, statut: fields[3].value, echeance: fields[4].value };
            else if (typeData === "projets") bodyData = { nom_projet: fields[0].value, id_client: fields[1].value, statut: fields[2].value, budget: fields[3].value, Commentaires: fields[4].value };
            else if (typeData === "utilisateurs") bodyData = { email: fields[0].value, password: fields[1].value };

            const fetchMethod = isEditing ? 'PUT' : 'POST';
            const fetchUrl = isEditing ? `${apiPath}&id=${targetId}` : apiPath;

            fetch(fetchUrl, {
                method: fetchMethod,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            })
            .then(res => res.json())
            .then(checkAuth)
            .then(res => {
                if (res.status === "success") {
                    mainForm.reset();
                    if (formSection) toggleBtn.click();
                    
                    isEditing = false;
                    submitBtn.textContent = "Enregistrer";
                    submitBtn.style.backgroundColor = ""; 
                    
                    loadData();
                } else {
                    alert("Erreur BDD : " + res.message);
                }
            })
            .catch(err => console.error("Erreur Fetch :", err));
        });

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (formSection.hasAttribute('hidden') && isEditing) {
                    isEditing = false;
                    mainForm.reset();
                    submitBtn.textContent = "Enregistrer";
                    submitBtn.style.backgroundColor = "";
                }
            });
        }
    }


    // ==========================================
    // MENU CONTEXTUEL (CLIC DROIT)
    // ==========================================

    const menuStyle = document.createElement('style');
    menuStyle.innerHTML = `
        #context-menu {
            position: absolute; display: none; background: #fff;
            border: 1px solid #ddd; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            border-radius: 6px; padding: 5px 0; z-index: 1000; min-width: 150px;
        }
        #context-menu ul { list-style: none; padding: 0; margin: 0; }
        #context-menu li { padding: 10px 15px; cursor: pointer; font-size: 14px; color: #333; display: flex; align-items: center; gap: 8px;}
        #context-menu li:hover { background-color: #f5f5f5; }
        .danger-text { color: var(--danger) !important; }
    `;
    document.head.appendChild(menuStyle);

    const contextMenu = document.createElement('div');
    contextMenu.id = 'context-menu';
    contextMenu.innerHTML = `
        <ul>
            <li id="menu-edit">✏️ Modifier</li>
            <li id="menu-delete" class="danger-text">🗑️ Supprimer</li>
            <li id="menu-csv">📊 Exporter en CSV</li>
            <li id="menu-pdf">📄 Générer PDF</li>
        </ul>
    `;
    document.body.appendChild(contextMenu);

    let targetId = null;
    let targetData = null;
    let isEditing = false;

    document.addEventListener('click', () => { contextMenu.style.display = 'none'; });


    // ==========================================
    // BARRE DE RECHERCHE
    // ==========================================

    const targetTable = document.querySelector('table');
    
    if (targetTable) {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Rechercher dans le tableau...';
        searchInput.id = 'table-search';
        
        searchInput.style.width = '100%';
        searchInput.style.padding = '10px 15px';
        searchInput.style.marginBottom = '20px';
        searchInput.style.border = '1px solid var(--border, #ddd)';
        searchInput.style.borderRadius = '6px';
        searchInput.style.fontSize = '1rem';
        
        targetTable.parentNode.insertBefore(searchInput, targetTable);
        
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const tableRows = targetTable.querySelectorAll('tbody tr');
            
            tableRows.forEach(row => {
                const rowText = row.textContent.toLowerCase();
                row.style.display = rowText.includes(searchTerm) ? '' : 'none';
            });
        });
    }


    // ==========================================
    // CHARGEMENT DES DONNÉES
    // ==========================================

    function loadData() {
        const tableBody = document.querySelector('tbody');
        if (!tableBody || !typeData) return;

        fetch(apiPath)
            .then(res => res.json())
            .then(checkAuth)
            .then(data => {
                tableBody.innerHTML = ''; 
                
                data.forEach(item => {
                    const row = tableBody.insertRow();
                    
                    if (typeData === "depenses") {
                        const d = new Date(item.date_depense);
                        row.innerHTML = `<td>${item.id_depense}</td><td>${d.toLocaleDateString('fr-FR')}</td><td>${item.nature}</td><td>${parseFloat(item.montant).toFixed(2)} €</td>`;
                    } else if (typeData === "clients") {
                        row.innerHTML = `<td>${item.id_client}</td><td>${item.nom}</td><td>${item.email}</td><td>${item.projet}</td>`;
                    } else if (typeData === "factures") {
                        const d = new Date(item.date_echeance);
                        row.innerHTML = `<td>${item.id_facture}</td><td>${item.id_client}</td><td>${parseFloat(item.montant_ht).toFixed(2)} €</td><td>${d.toLocaleDateString('fr-FR')}</td><td style="color: ${item.statut_paiement === 'Payée' ? 'green' : 'orange'}">${item.statut_paiement}</td>`;
                    }
                    else if (typeData === "projets") {
                        row.innerHTML = `<td>${item.id_projet}</td><td>${item.nom_projet}</td><td>${item.id_client || '-'}</td><td><span style="padding: 4px 8px; border-radius: 4px; background: #f0f0f0;">${item.statut}</span></td><td>${item.budget ? parseFloat(item.budget).toFixed(2) + ' €' : '-'}</td><td>${item.Commentaires || ''}</td>`;
                    }
                    else if (typeData === "utilisateurs") {
                        row.innerHTML = `<td>${item.id_user}</td><td>${item.email}</td><td><span style="color: green;">🔒 Haché (Bcrypt)</span></td>`;
                    }

                    row.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        
                        if (typeData === "depenses") targetId = item.id_depense;
                        else if (typeData === "clients") targetId = item.id_client;
                        else if (typeData === "factures") targetId = item.id_facture;
                        else if (typeData === "projets") targetId = item.id_projet;
                        else if (typeData === "utilisateurs") targetId = item.id_user;

                        targetData = item;
                                            
                        const pdfBtn = document.getElementById('menu-pdf');
                        pdfBtn.style.display = typeData === 'factures' ? 'flex' : 'none';

                        contextMenu.style.display = 'block';
                        contextMenu.style.left = `${e.pageX}px`;
                        contextMenu.style.top = `${e.pageY}px`;
                    });
                });
            })
            .catch(err => console.error("Erreur de chargement BDD:", err));
    }

    if (typeData) loadData(); 


    // ==========================================
    // ACTIONS DU MENU CONTEXTUEL
    // ==========================================

    document.getElementById('menu-delete').addEventListener('click', () => {
        if (!targetId) return;
        if (confirm(`Supprimer l'élément #${targetId} définitivement ?`)) {
            fetch(`${apiPath}&id=${targetId}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(checkAuth)
            .then(res => {
                if (res.status === "success") loadData();
                else alert("Erreur lors de la suppression : " + res.message);
            });
        }
    });

    document.getElementById('menu-edit').addEventListener('click', () => {
        if (!targetId || !targetData || !mainForm) return;
        
        if (formSection && formSection.hasAttribute('hidden')) toggleBtn.click();
        
        isEditing = true;
        submitBtn.textContent = "Mettre à jour l'élément";
        
        const fields = mainForm.querySelectorAll('input:not([type="submit"]), select, textarea');
        
        if (typeData === "depenses") {
            fields[0].value = targetData.nature;
            fields[1].value = targetData.montant;
            fields[2].value = targetData.date_depense.split(' ')[0];
        } else if (typeData === "clients") {
            fields[0].value = targetData.nom;
            fields[1].value = targetData.email;
            fields[2].value = targetData.projet;
        } else if (typeData === "factures") {
            fields[0].value = targetData.id_client;
            fields[1].value = targetData.montant_ht;
            fields[2].value = targetData.tva || 20.00; 
            fields[3].value = targetData.statut_paiement || "En attente"; 
            fields[4].value = targetData.date_echeance ? targetData.date_echeance.split(' ')[0] : '';
        } else if (typeData === "projets") {
            fields[0].value = targetData.nom_projet;
            fields[1].value = targetData.id_client;
            fields[2].value = targetData.statut;
            fields[3].value = targetData.budget;
            fields[4].value = targetData.Commentaires;
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('menu-pdf').addEventListener('click', () => {
        if (!targetData || typeData !== 'factures') return;

        try {
            if (typeof window.jspdf === 'undefined') {
                alert("Erreur : La bibliothèque jsPDF n'a pas pu se charger. Vérifiez les balises <script> dans suiviFactures.html");
                return;
            }

            window.jsPDF = window.jspdf.jsPDF;
            const doc = new window.jsPDF();

            doc.setFontSize(20);
            doc.text("FACTURE", 105, 20, { align: 'center' });
            
            doc.setFontSize(10);
            doc.text(`Référence : FACT-${targetData.id_facture || '000'}`, 20, 40);
            
            let dateStr = "Date inconnue";
            if (targetData.date_echeance) {
                dateStr = new Date(targetData.date_echeance).toLocaleDateString('fr-FR');
            }
            doc.text(`Date d'échéance : ${dateStr}`, 20, 47);
            
            doc.setFontSize(12);
            doc.text("Client :", 20, 65);
            doc.setFont("helvetica", "bold");
            doc.text(String(targetData.id_client || 'Non renseigné'), 20, 72);

            const montantHT = parseFloat(targetData.montant_ht) || 0;
            const tva = montantHT * 0.20;
            const montantTTC = montantHT + tva;

            doc.autoTable({
                startY: 85,
                head: [['Description', 'Montant HT', 'TVA (20%)', 'Total TTC']],
                body: [
                    ['Prestation de service', montantHT.toFixed(2) + ' €', tva.toFixed(2) + ' €', montantTTC.toFixed(2) + ' €']
                ],
                theme: 'striped',
                headStyles: { fillColor: [100, 100, 255] }
            });

            const finalY = doc.lastAutoTable.finalY || 100;
            doc.setFontSize(14);
            doc.text(`Total à payer : ${montantTTC.toFixed(2)} €`, 190, finalY + 20, { align: 'right' });
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "italic");
            doc.text("Merci de votre confiance.", 105, finalY + 40, { align: 'center' });

            doc.save(`Facture_${targetData.id_facture}.pdf`);

        } catch (error) {
            console.error("ERREUR FATALE LORS DE LA CRÉATION DU PDF :", error);
            alert("Une erreur a empêché la création du PDF. Ouvrez la console (F12) pour voir le détail.");
        }
    });

    const btnCsv = document.getElementById('menu-csv');
    if (btnCsv) {
        btnCsv.addEventListener('click', () => {
            const table = document.querySelector('table');
            if (!table) return;

            let csvContent = "";
            const rows = table.querySelectorAll('tr');

            rows.forEach(row => {
                if (row.style.display === 'none') return;

                const cols = row.querySelectorAll('th, td');
                let rowData = [];
                
                cols.forEach(col => {
                    let data = col.textContent.replace(/"/g, '""').trim();
                    rowData.push(`"${data}"`);
                });
                
                csvContent += rowData.join(";") + "\n";
            });

            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            const dateStr = new Date().toISOString().split('T')[0];
            
            link.setAttribute('href', url);
            link.setAttribute('download', `export_${typeData || 'donnees'}_${dateStr}.csv`);
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }


    // ==========================================
    // NAVIGATION ACTIVE
    // ==========================================

    const currentPath = window.location.pathname;
    document.querySelectorAll('nav a').forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref && currentPath.includes(linkHref.replace('../', ''))) {
            link.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            link.style.color = '#ffffff';
        }
    });


    // ==========================================
    // SIDEBAR
    // ==========================================

    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('close-sidebar');
    const openBtn = document.getElementById('open-sidebar');
    const container = document.querySelector('.app-container');

    if (closeBtn && openBtn && sidebar) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.add('sidebar-hidden');
            container.classList.add('full-width');
        });

        openBtn.addEventListener('click', () => {
            sidebar.classList.remove('sidebar-hidden');
            container.classList.remove('full-width');
        });
    }


    // ==========================================
    // CALCUL AUTOMATIQUE TVA
    // ==========================================

    document.querySelectorAll('label').forEach(label => {
        if (label.textContent.includes('Montant HT')) {
            const htInput = label.nextElementSibling; 
            
            if (htInput && htInput.tagName === 'INPUT') {
                const ttcDisplay = document.createElement('div');
                ttcDisplay.style.margin = "-10px 0 15px 0";
                ttcDisplay.style.fontSize = "0.85rem";
                ttcDisplay.style.color = "var(--primary-color)";
                ttcDisplay.innerHTML = `<strong>Total TTC (20%) : </strong><span class="ttc-val">0.00</span> €`;
                
                htInput.after(ttcDisplay);

                htInput.addEventListener('input', () => {
                    const htValue = parseFloat(htInput.value) || 0;
                    const ttcValue = (htValue * 1.20).toFixed(2);
                    ttcDisplay.querySelector('.ttc-val').textContent = ttcValue;
                });
            }
        }
    });

});
