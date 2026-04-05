document.addEventListener("DOMContentLoaded", function() {
    const body = document.body;

    if (body.classList.contains('light-theme')) {
        
        const headerHTML = `
            <header class="top-header">
                <div class="header-logo">FightPass</div>
                <div class="search-container">
                    <input type="text" placeholder="Pesquisar... (academia, modalidade, aluno)" class="top-search">
                </div>
                <div class="user-profile-badge">
                    <span class="user-name">João</span>
                    <span class="user-role">Cliente</span>
                </div>
            </header>
        `;

        const sidebarHTML = `
            <nav class="sidebar">
                <a href="dashboard.html" class="nav-link" id="nav-home">Home</a>
                <a href="mapa.html" class="nav-link" id="nav-mapa">Mapa</a>
                <a href="agendar.html" class="nav-link" id="nav-agendar">Agendar</a>
                <a href="minhas-aulas.html" class="nav-link" id="nav-aulas">Minhas aulas</a>
                <a href="gestao.html" class="nav-link" id="nav-gestao">Gestão</a>
                <a href="perfil.html" class="nav-link" id="nav-perfil">Perfil</a>
            </nav>
        `;

        body.insertAdjacentHTML('afterbegin', headerHTML + sidebarHTML);

        const path = window.location.pathname;
        const navMap = {
            "dashboard": "nav-home",
            "mapa": "nav-mapa",
            "agendar": "nav-agendar",
            "minhas-aulas": "nav-aulas",
            "gestao": "nav-gestao",
            "perfil": "nav-perfil"
        };

        Object.keys(navMap).forEach(key => {
            if (path.includes(key)) {
                const el = document.getElementById(navMap[key]);
                if (el) el.classList.add("active");
            }
        });
    }
});