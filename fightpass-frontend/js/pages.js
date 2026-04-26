(function () {
  const api = window.FightPassApi;

  function $(selector) {
    return document.querySelector(selector);
  }

  function $all(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function html(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setMessage(target, message, type = "info", details = null) {
    const element = typeof target === "string" ? $(target) : target;
    if (!element) return;
    const detailText = Array.isArray(details)
      ? `<ul>${details.map((item) => `<li>${html(item.msg || item.message || JSON.stringify(item))}</li>`).join("")}</ul>`
      : "";
    element.className = `state-message ${type}`;
    element.innerHTML = message ? `${html(message)}${detailText}` : "";
    element.hidden = !message;
  }

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = value;
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function formatCurrency(cents) {
    return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function nextDateForDay(dayOfWeek) {
    const date = new Date();
    const target = Number(dayOfWeek);
    const distance = (target - date.getDay() + 7) % 7;
    date.setDate(date.getDate() + distance);
    return date.toISOString().slice(0, 10);
  }

  function renderFlash() {
    const flash = api.consumeFlash();
    if (flash) setMessage("[data-flash]", flash.message, flash.type);
  }

  function currentInstitutionOrStop(user, messageTarget) {
    const institutionId = api.firstInstitutionId(user);
    if (!institutionId) {
      setMessage(messageTarget, "Este usuário não está vinculado a uma instituiçao ativa.", "error");
      return null;
    }
    return institutionId;
  }

  async function initLogin() {
    api.redirectIfAuthenticated();
    renderFlash();
    const form = $("#login-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage("#login-message", "Autenticando...", "loading");
      const data = formData(form);
      try {
        const response = await api.login(data.email, data.password);
        api.saveSession(response.data);
        api.redirectByRole(response.data.user);
      } catch (error) {
        setMessage("#login-message", error.message, "error", error.details);
      }
    });
  }

  async function initCadastro() {
    api.redirectIfAuthenticated();
    const form = $("#register-form");
    const accountType = $("#account-type");
    const institutionGroup = $("#institution-group");

    function syncInstitutionField() {
      institutionGroup.hidden = accountType.value !== "institution_admin";
    }

    accountType.addEventListener("change", syncInstitutionField);
    syncInstitutionField();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage("#register-message", "Criando conta...", "loading");
      const data = formData(form);
      try {
        const response = await api.register({
          name: data.name,
          email: data.email,
          password: data.password,
          accountType: data.accountType,
          document: data.document,
          phone: data.phone || null,
          institutionName: data.institutionName || data.name
        });
        api.saveSession(response.data);
        api.setFlash(response.data.access ? "Conta criada com teste gratuito de 1 dia." : "Conta criada com sucesso.", "success");
        api.redirectByRole(response.data.user);
      } catch (error) {
        setMessage("#register-message", error.message, "error", error.details);
      }
    });
  }

  async function initRecuperacaoSenha() {
    api.redirectIfAuthenticated();
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const emailForm = $("#forgot-form");
    const resetForm = $("#reset-form");

    emailForm.hidden = Boolean(token);
    resetForm.hidden = !token;

    emailForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage("#recovery-message", "Enviando solicitação..", "loading");
      try {
        const data = formData(emailForm);
        const response = await api.forgotPassword(data.email);
        api.setFlash(response.message, "success");
        window.location.href = "sucesso-email.html";
      } catch (error) {
        setMessage("#recovery-message", error.message, "error", error.details);
      }
    });

    resetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = formData(resetForm);
      if (data.password !== data.confirmPassword) {
        setMessage("#recovery-message", "A confirmação deve ser igual a nova senha.", "error");
        return;
      }
      setMessage("#recovery-message", "Redefinindo senha...", "loading");
      try {
        await api.resetPassword(token, data.password);
        api.setFlash("Senha redefinida com sucesso, faça login novamente", "success");
        window.location.href = "login.html";
      } catch (error) {
        setMessage("#recovery-message", error.message, "error", error.details);
      }
    });
  }

  async function initDashboard() {
    const user = await api.requireAuth();
    if (!user) return;
    renderFlash();
    setMessage("#dashboard-message", "Carregando indicadores...", "loading");
    try {
      if (user.role === "student") {
        const [response, accessResponse] = await Promise.all([
          api.request("/dashboard/student"),
          api.request("/access/me")
        ]);
        setText("#metric-one-label", "Aulas agendadas");
        setText("#metric-one-value", response.data.weekly_classes ?? 0);
        setText("#metric-two-label", "Presença");
        setText("#metric-two-value", `${response.data.attendance_rate ?? 0}%`);
        setText("#metric-three-label", "Avaliação");
        setText("#metric-three-value", response.data.average_score ?? 0);
        renderAccessSummary(accessResponse.data);
      } else {
        const institutionId = currentInstitutionOrStop(user, "#dashboard-message");
        if (!institutionId) return;
        const response = await api.request(`/dashboard/institution/${institutionId}`);
        setText("#metric-one-label", "Alunos ativos");
        setText("#metric-one-value", response.data.active_students ?? 0);
        setText("#metric-two-label", "Presença média");
        setText("#metric-two-value", `${response.data.attendance_rate ?? 0}%`);
        setText("#metric-three-label", "Risco de evasão");
        setText("#metric-three-value", `${response.data.dropout_risk_rate ?? 0}%`);
      }
      setMessage("#dashboard-message", "", "info");
    } catch (error) {
      setMessage("#dashboard-message", error.message, "error", error.details);
    }
  }

  function renderAccessSummary(accessData) {
    const panel = $("#access-summary");
    if (!panel) return;

    panel.hidden = false;
    if (!accessData || !accessData.hasActiveAccess) {
      panel.innerHTML = `
        <h2 style="font-size: 18px; margin-bottom: 8px;">Acesso FightPass</h2>
        <p style="color:#991B1B;">Seu teste terminou ou você ainda não possui plano ativo.</p>
        <a class="btn-primary" style="display:inline-block; width:auto; margin-top:14px; padding:10px 18px;" href="planos.html">Contratar plano</a>
      `;
      return;
    }

    const access = accessData.access;
    const remaining = access.sessions_total === null
      ? "Ilimitado"
      : `${Math.max(0, access.sessions_total - access.sessions_used)} treino(s)`;
    panel.innerHTML = `
      <h2 style="font-size: 18px; margin-bottom: 8px;">Acesso FightPass</h2>
      <p><strong>${html(access.plan_name)}</strong></p>
      <p style="color:#64748B;">Validade: ${api.formatDate(access.expires_at)} | Treinos restantes: ${remaining}</p>
      <a class="btn-secondary" style="display:inline-block; width:auto; margin-top:14px; padding:10px 18px;" href="planos.html">Ver planos</a>
    `;
  }

  async function initMapa() {
    const user = await api.requireAuth();
    if (!user) return;
    let selectedModality = "";
    const searchInput = $("#map-search");
    const modalityList = $("#modality-list");
    const institutionList = $("#institution-list");
    const details = $("#institution-details");

    async function loadInstitutions() {
      setMessage("#map-message", "Carregando academias...", "loading");
      const params = new URLSearchParams();
      if (selectedModality) params.set("modality", selectedModality);
      if (searchInput.value) params.set("search", searchInput.value);
      try {
        const response = await api.request(`/map/search?${params.toString()}`);
        if (!response.data.length) {
          institutionList.innerHTML = `<div class="empty-state">Nenhuma instituição encontrada para os filtros informados.</div>`;
        } else {
          institutionList.innerHTML = response.data.map((item) => `
            <button class="result-card" data-id="${item.id}">
              <strong>${html(item.name)}</strong>
              <span>${html([item.neighborhood, item.city, item.state].filter(Boolean).join(" - "))}</span>
              <small>${html(item.description || "Sem descrição cadastrada.")}</small>
            </button>
          `).join("");
        }
        setMessage("#map-message", "", "info");
      } catch (error) {
        setMessage("#map-message", error.message, "error", error.details);
      }
    }

    modalityList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-slug]");
      if (!button) return;
      selectedModality = button.dataset.slug;
      $all("[data-slug]").forEach((item) => item.classList.toggle("active-filter", item === button));
      loadInstitutions();
    });

    institutionList.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-id]");
      if (!button) return;
      setMessage("#map-message", "Carregando detalhes...", "loading");
      try {
        const response = await api.request(`/institutions/${button.dataset.id}`);
        const item = response.data;
        details.innerHTML = `
          <h2>${html(item.name)}</h2>
          <p>${html(item.description || "Sem descrição cadastrada.")}</p>
          <p><strong>Contato:</strong> ${html(item.email || "-")} ${html(item.phone || "")}</p>
          <p><strong>Endereço:</strong> ${html([item.street, item.number, item.neighborhood, item.city, item.state].filter(Boolean).join(", "))}</p>
          <h3>Turmas vinculadas</h3>
          ${item.classes.length ? `<ul class="simple-list">${item.classes.map((classItem) => `
            <li>${html(classItem.title)} - ${html(classItem.modality_name)} (${api.dayLabel(classItem.day_of_week)} ${api.timeLabel(classItem.start_time)})</li>
          `).join("")}</ul>` : `<div class="empty-state">Nenhuma turma ativa vinculada.</div>`}
        `;
        setMessage("#map-message", "", "info");
      } catch (error) {
        setMessage("#map-message", error.message, "error", error.details);
      }
    });

    searchInput.addEventListener("input", () => loadInstitutions());

    try {
      const response = await api.request("/modalities");
      modalityList.innerHTML = [
        `<button class="filter-button active-filter" data-slug="">Todas</button>`,
        ...response.data.map((item) => `<button class="filter-button" data-slug="${html(item.slug)}">${html(item.name)}</button>`)
      ].join("");
      await loadInstitutions();
    } catch (error) {
      setMessage("#map-message", error.message, "error", error.details);
    }
  }

  async function initAgendar() {
    const user = await api.requireAuth(["student"]);
    if (!user) return;
    const scheduleSelect = $("#class-schedule-id");
    const bookingDate = $("#booking-date");
    const recurring = $("#is-recurring");
    const endDate = $("#end-date");
    const preview = $("#schedule-preview");
    let schedules = [];

    function syncSelectedSchedule() {
      const selected = schedules.find((item) => String(item.schedule.id) === scheduleSelect.value);
      if (!selected) return;
      bookingDate.value = nextDateForDay(selected.schedule.day_of_week);
      const end = new Date(`${bookingDate.value}T00:00:00`);
      end.setDate(end.getDate() + 28);
      endDate.value = end.toISOString().slice(0, 10);
    }

    function renderPreview() {
      preview.innerHTML = schedules.length ? schedules.map((item) => `
        <tr>
          <td>${api.dayLabel(item.schedule.day_of_week)}</td>
          <td>${api.timeLabel(item.schedule.start_time)}</td>
          <td>${html(item.modality_name)}</td>
          <td>${html(item.institution_name)}</td>
        </tr>
      `).join("") : `<tr><td colspan="4">Nenhuma turma ativa encontrada.</td></tr>`;
    }

    setMessage("#booking-message", "Carregando turmas...", "loading");
    try {
      const response = await api.request("/classes");
      schedules = response.data.flatMap((classItem) => (classItem.schedules || []).map((schedule) => ({
        ...classItem,
        schedule
      })));
      scheduleSelect.innerHTML = schedules.map((item) => `
        <option value="${item.schedule.id}">
          ${html(item.institution_name)} - ${html(item.title)} - ${html(item.modality_name)} (${api.dayLabel(item.schedule.day_of_week)} ${api.timeLabel(item.schedule.start_time)})
        </option>
      `).join("");
      renderPreview();
      syncSelectedSchedule();
      setMessage("#booking-message", "", "info");
    } catch (error) {
      setMessage("#booking-message", error.message, "error", error.details);
    }

    scheduleSelect.addEventListener("change", syncSelectedSchedule);
    recurring.addEventListener("change", () => {
      $("#recurring-fields").hidden = !recurring.checked;
    });

    $("#booking-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage("#booking-message", "Enviando agendamento...", "loading");
      const payload = {
        classScheduleId: Number(scheduleSelect.value),
        isTrial: $("#is-trial").checked
      };
      try {
        const response = recurring.checked
          ? await api.request("/bookings/recurring", {
            method: "POST",
            body: { ...payload, startDate: bookingDate.value, endDate: endDate.value }
          })
          : await api.request("/bookings", {
            method: "POST",
            body: { ...payload, bookingDate: bookingDate.value }
          });
        const total = Array.isArray(response.data) ? response.data.length : 1;
        setMessage("#booking-message", `${response.message} (${total} aula${total > 1 ? "s" : ""}).`, "success");
      } catch (error) {
        setMessage("#booking-message", error.message, "error", error.details);
      }
    });
  }

  async function initMinhasAulas() {
    const user = await api.requireAuth(["student"]);
    if (!user) return;
    const tbody = $("#bookings-table");

    const treatedStatus = {
      scheduled: "Agendada",
      confirmed: "Confirmada",
      missed: "Faltou",
      cancelled: "Cancelada"
    };

    async function loadBookings() {
      setMessage("#my-classes-message", "Carregando aulas...", "loading");
      try {
        const response = await api.request("/bookings");
        tbody.innerHTML = response.data.length ? response.data.map((item) => `
          <tr>
            <td>${api.formatDate(item.booking_date)}</td>
            <td>${api.dayLabel(item.day_of_week)}</td>
            <td>${api.timeLabel(item.start_time)}</td>
            <td><span class="badge-modalidade">${html(item.modality_name)}</span></td>
            <td>${html(treatedStatus[item.status])}</td>
            <td>
              <button class="btn-cancel" data-cancel="${item.id}" ${item.status === "cancelled" ? "disabled" : ""}>Cancelar</button>
            </td>
          </tr>
        `).join("") : `<tr><td colspan="6">Nenhuma aula encontrada.</td></tr>`;
        setMessage("#my-classes-message", "", "info");
      } catch (error) {
        setMessage("#my-classes-message", error.message, "error", error.details);
      }
    }

    tbody.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-cancel]");
      if (!button) return;
      setMessage("#my-classes-message", "Cancelando aula...", "loading");
      try {
        const response = await api.request(`/bookings/${button.dataset.cancel}`, { method: "DELETE" });
        setMessage("#my-classes-message", response.message, "success");
        await loadBookings();
      } catch (error) {
        setMessage("#my-classes-message", error.message, "error", error.details);
      }
    });

    await loadBookings();
  }

  async function initCheckin() {
    const user = await api.requireAuth(["student"]);
    if (!user) return;
    let countdownTimer = null;
    let currentToken = null;

    function startCountdown(expiresAt) {
      clearInterval(countdownTimer);
      const display = $("#countdown");
      countdownTimer = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
        display.textContent = `00:${String(remaining).padStart(2, "0")}`;
        if (remaining <= 0) {
          clearInterval(countdownTimer);
          setMessage("#checkin-message", "Token expirado. Gere um novo código.", "error");
        }
      }, 500);
    }

    $("#generate-token").addEventListener("click", async () => {
      setMessage("#checkin-message", "Gerando token...", "loading");
      try {
        const response = await api.request("/checkin/token", { method: "POST", body: {} });
        currentToken = response.data.token;
        $("#token-value").textContent = currentToken;
        $("#qr-code").src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentToken)}`;
        $("#qr-area").hidden = false;
        startCountdown(response.data.expiresAt);
        setMessage("#checkin-message", response.message, "success");
      } catch (error) {
        setMessage("#checkin-message", error.message, "error", error.details);
      }
    });

    $("#confirm-token").addEventListener("click", async () => {
      if (!currentToken) {
        setMessage("#checkin-message", "Gere um token antes de confirmar o check-in.", "error");
        return;
      }
      setMessage("#checkin-message", "Confirmando presença...", "loading");
      try {
        const response = await api.request("/checkin/confirm", { method: "POST", body: { token: currentToken } });
        clearInterval(countdownTimer);
        setMessage("#checkin-message", response.message, "success");
      } catch (error) {
        setMessage("#checkin-message", error.message, "error", error.details);
      }
    });
  }

  async function initPerfil() {
    const user = await api.requireAuth();
    if (!user) return;

    async function loadProfile() {
      setMessage("#profile-message", "Carregando perfil...", "loading");
      try {
        const response = await api.request("/profile");
        const profile = response.data;
        $("#profile-name").value = profile.name || "";
        $("#profile-email").value = profile.email || "";
        $("#profile-phone").value = profile.phone || "";
        $("#profile-document").value = profile.document || "";
        $("#profile-role").value = api.roleLabel(profile.role);
        setMessage("#profile-message", "", "info");
      } catch (error) {
        setMessage("#profile-message", error.message, "error", error.details);
      }
    }

    $("#profile-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage("#profile-message", "Salvando perfil...", "loading");
      const data = formData(event.currentTarget);
      try {
        const response = await api.request("/profile", {
          method: "PUT",
          body: { name: data.name, phone: data.phone, document: data.document }
        });
        localStorage.setItem("fightpass.user", JSON.stringify(response.data));
        setMessage("#profile-message", response.message, "success");
      } catch (error) {
        setMessage("#profile-message", error.message, "error", error.details);
      }
    });

    $("#password-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage("#password-message", "Alterando senha...", "loading");
      const data = formData(event.currentTarget);
      try {
        const response = await api.request("/profile/password", {
          method: "PUT",
          body: {
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
            confirmPassword: data.confirmPassword
          }
        });
        event.currentTarget.reset();
        setMessage("#password-message", response.message, "success");
      } catch (error) {
        setMessage("#password-message", error.message, "error", error.details);
      }
    });

    await loadProfile();
  }

  async function initGestao() {
    const user = await api.requireAuth(["institution_admin", "instructor"]);
    if (!user) return;
    const institutionId = currentInstitutionOrStop(user, "#management-message");
    if (!institutionId) return;
    const tbody = $("#students-table");

    setMessage("#management-message", "Carregando gestão...", "loading");
    try {
      const [dashboard, students] = await Promise.all([
        api.request(`/dashboard/institution/${institutionId}`),
        api.request(`/institutions/${institutionId}/students`)
      ]);
      setText("#active-students", dashboard.data.active_students ?? 0);
      setText("#attendance-rate", `${dashboard.data.attendance_rate ?? 0}%`);
      setText("#risk-rate", `${dashboard.data.dropout_risk_rate ?? 0}%`);
      tbody.innerHTML = students.data.length ? students.data.map((student) => `
        <tr>
          <td>${html(student.name)}</td>
          <td>${html(student.modality_name)}</td>
          <td>${html(student.enrollment_status)}</td>
          <td>
            <a href="perfil-aluno.html?id=${student.id}">Ver perfil</a>
            <a href="avaliar-aluno.html?id=${student.id}" style="margin-left: 12px;">Avaliar</a>
          </td>
        </tr>
      `).join("") : `<tr><td colspan="4">Nenhum aluno ativo encontrado.</td></tr>`;
      setMessage("#management-message", "", "info");
    } catch (error) {
      setMessage("#management-message", error.message, "error", error.details);
    }
  }

  async function initPerfilAluno() {
    const user = await api.requireAuth(["institution_admin", "instructor"]);
    if (!user) return;
    const studentId = new URLSearchParams(window.location.search).get("id");
    if (!studentId) {
      setMessage("#student-profile-message", "Selecione um aluno pela tela de gestão.", "error");
      return;
    }

    setMessage("#student-profile-message", "Carregando aluno...", "loading");
    try {
      const [profile, progress, evaluations] = await Promise.all([
        api.request(`/students/${studentId}/profile`),
        api.request(`/students/${studentId}/progress`),
        api.request(`/students/${studentId}/evaluations`)
      ]);
      setText("#student-name", profile.data.name);
      setText("#student-modality", profile.data.modality_name || "-");
      setText("#student-attendance", `${profile.data.attendance_rate ?? 0}%`);
      setText("#student-score", profile.data.average_score ?? 0);
      $("#evaluate-link").href = `avaliar-aluno.html?id=${studentId}`;
      $("#progress-list").innerHTML = progress.data.length ? progress.data.map((item) => `
        <div class="timeline-row">
          <span>${api.formatMonth(item.reference_month)}</span>
          <strong>Nota ${item.average_score} | Presença ${item.attendance_rate}% | Risco ${html(item.risk_level)}</strong>
        </div>
      `).join("") : `<div class="empty-state">Sem histórico de progresso.</div>`;
      $("#evaluation-list").innerHTML = evaluations.data.length ? evaluations.data.map((item) => `
        <div class="timeline-row">
          <span>${api.formatDate(item.created_at)} - ${html(item.modality_name)}</span>
          <strong>${item.score}</strong>
          <small>${html(item.comment || "Sem comentário.")}</small>
        </div>
      `).join("") : `<div class="empty-state">Sem avaliações registradas.</div>`;
      setMessage("#student-profile-message", "", "info");
    } catch (error) {
      setMessage("#student-profile-message", error.message, "error", error.details);
    }
  }

  async function initAvaliarAluno() {
    const user = await api.requireAuth(["institution_admin", "instructor"]);
    if (!user) return;
    const institutionId = currentInstitutionOrStop(user, "#evaluation-message");
    if (!institutionId) return;
    const selectedId = new URLSearchParams(window.location.search).get("id");
    const studentSelect = $("#student-id");
    let students = [];

    function syncStudent() {
      const selected = students.find((student) => String(student.id) === studentSelect.value);
      setText("#student-modality-label", selected ? selected.modality_name : "-");
      $("#modality-id").value = selected ? selected.modality_id : "";
    }

    setMessage("#evaluation-message", "Carregando alunos...", "loading");
    try {
      const response = await api.request(`/institutions/${institutionId}/students`);
      students = response.data;
      studentSelect.innerHTML = students.map((student) => `
        <option value="${student.id}" ${String(student.id) === selectedId ? "selected" : ""}>${html(student.name)}</option>
      `).join("");
      syncStudent();
      setMessage("#evaluation-message", students.length ? "" : "Nenhum aluno disponível para avaliação.", students.length ? "info" : "error");
    } catch (error) {
      setMessage("#evaluation-message", error.message, "error", error.details);
    }

    studentSelect.addEventListener("change", syncStudent);

    $("#evaluation-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = formData(event.currentTarget);
      setMessage("#evaluation-message", "Salvando avaliação...", "loading");
      try {
        const response = await api.request(`/students/${data.studentId}/evaluations`, {
          method: "POST",
          body: {
            institutionId,
            modalityId: Number(data.modalityId),
            score: Number(data.score),
            comment: data.comment
          }
        });
        setMessage("#evaluation-message", response.message, "success");
      } catch (error) {
        setMessage("#evaluation-message", error.message, "error", error.details);
      }
    });
  }

  async function initPlanos() {
    const user = await api.requireAuth(["student"]);
    if (!user) return;

    const plansList = $("#plans-list");
    const currentAccess = $("#current-access");
    const paymentResult = $("#payment-result");

    async function loadAccess() {
      try {
        const response = await api.request("/access/me");
        if (!response.data.hasActiveAccess) {
          currentAccess.innerHTML = `
            <h2 style="font-size: 18px; margin-bottom: 8px;">Acesso atual</h2>
            <p style="color:#991B1B;">Você não possui plano ativo. O teste de 1 dia é liberado apenas uma vez por CPF.</p>
          `;
          return;
        }

        const access = response.data.access;
        const remaining = access.sessions_total === null
          ? "Ilimitado"
          : `${Math.max(0, access.sessions_total - access.sessions_used)} treino(s)`;
        currentAccess.innerHTML = `
          <h2 style="font-size: 18px; margin-bottom: 8px;">Acesso atual</h2>
          <p><strong>${html(access.plan_name)}</strong></p>
          <p style="color:#64748B;">Validade: ${api.formatDate(access.expires_at)} | Treinos restantes: ${remaining}</p>
        `;
      } catch (error) {
        currentAccess.innerHTML = `<p style="color:#991B1B;">${html(error.message)}</p>`;
      }
    }

    function renderPayment(payment) {
      paymentResult.hidden = false;
      if (payment.method === "pix") {
        paymentResult.innerHTML = `
          <h2 style="font-size: 18px; margin-bottom: 8px;">Pix gerado</h2>
          <p style="color:#64748B;">${html(payment.prototypeNotice)}</p>
          <div class="qr-frame" style="display:inline-block; margin:18px 0;">
            <img alt="QR Code Pix fictício" style="width:220px;height:220px;" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payment.pixCode)}">
          </div>
          <div class="token-box">${html(payment.pixCode)}</div>
          <button class="btn-primary" style="width:auto; margin-top:16px; padding:12px 24px;" data-confirm-payment="${payment.id}">Confirmar pagamento fictício</button>
        `;
        return;
      }

      paymentResult.innerHTML = `
        <h2 style="font-size: 18px; margin-bottom: 8px;">Boleto gerado</h2>
        <p style="color:#64748B;">${html(payment.prototypeNotice)}</p>
        <div class="token-box" style="margin-top:16px;">${html(payment.boletoCode)}</div>
        <button class="btn-primary" style="width:auto; margin-top:16px; padding:12px 24px;" data-confirm-payment="${payment.id}">Confirmar pagamento fictício</button>
      `;
    }

    setMessage("#plans-message", "Carregando planos...", "loading");
    try {
      await loadAccess();
      const response = await api.request("/plans");
      plansList.innerHTML = response.data.map((plan) => `
        <article class="card-white" style="display:flex; flex-direction:column; gap:12px;">
          <h2 style="font-size:20px;">${html(plan.name)}</h2>
          <p style="color:#64748B; min-height:54px;">${html(plan.description)}</p>
          <strong style="font-size:28px; color:var(--primary-blue);">${formatCurrency(plan.priceCents)}</strong>
          <small style="color:#64748B;">${plan.sessionLimit === null ? "Treinos ilimitados" : `${plan.sessionLimit} treino(s)`} por ${plan.durationDays} dias</small>
          <button class="btn-primary" type="button" data-plan-id="${plan.id}">Contratar</button>
        </article>
      `).join("");
      setMessage("#plans-message", "", "info");
    } catch (error) {
      setMessage("#plans-message", error.message, "error", error.details);
    }

    plansList.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-plan-id]");
      if (!button) return;
      setMessage("#plans-message", "Gerando cobrança fictícia...", "loading");
      try {
        const response = await api.request("/payments/simulate", {
          method: "POST",
          body: {
            planId: Number(button.dataset.planId),
            method: $("#payment-method").value
          }
        });
        renderPayment(response.data);
        setMessage("#plans-message", response.message, "success");
      } catch (error) {
        setMessage("#plans-message", error.message, "error", error.details);
      }
    });

    paymentResult.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-confirm-payment]");
      if (!button) return;
      setMessage("#plans-message", "Confirmando pagamento fictício...", "loading");
      try {
        const response = await api.request(`/payments/${button.dataset.confirmPayment}/confirm`, {
          method: "POST"
        });
        setMessage("#plans-message", response.message, "success");
        paymentResult.hidden = true;
        await loadAccess();
      } catch (error) {
        setMessage("#plans-message", error.message, "error", error.details);
      }
    });
  }

  const pages = {
    login: initLogin,
    cadastro: initCadastro,
    "recuperar-senha": initRecuperacaoSenha,
    dashboard: initDashboard,
    mapa: initMapa,
    agendar: initAgendar,
    planos: initPlanos,
    "minhas-aulas": initMinhasAulas,
    checkin: initCheckin,
    perfil: initPerfil,
    gestao: initGestao,
    "perfil-aluno": initPerfilAluno,
    "avaliar-aluno": initAvaliarAluno
  };

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    if (pages[page]) {
      pages[page]();
    }
  });
})();
