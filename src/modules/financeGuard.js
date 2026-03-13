const FINANCE_PASSWORD = "5621";

export function initFinanceGuard(elements) {
  let isFinanceUnlocked = false;

  const modal = elements.financeGuardModal;
  const input = elements.financePasswordInput;
  const unlockBtn = elements.financeUnlockBtn;
  const cancelBtn = elements.financeCancelBtn;

  function closeModal() {
    modal.hidden = true;
    input.value = "";
  }

  function openModal() {
    modal.hidden = false;
    input.value = "";
    input.focus();
  }

  function promptPassword() {
    return new Promise((resolve) => {
      const onUnlock = () => {
        if (input.value === FINANCE_PASSWORD) {
          isFinanceUnlocked = true;
          cleanup();
          closeModal();
          resolve(true);
          return;
        }
        alert("Wrong password");
      };

      const onCancel = () => {
        cleanup();
        closeModal();
        resolve(false);
      };

      const onEnter = (event) => {
        if (event.key === "Enter") onUnlock();
      };

      function cleanup() {
        unlockBtn.removeEventListener("click", onUnlock);
        cancelBtn.removeEventListener("click", onCancel);
        input.removeEventListener("keydown", onEnter);
      }

      unlockBtn.addEventListener("click", onUnlock);
      cancelBtn.addEventListener("click", onCancel);
      input.addEventListener("keydown", onEnter);
      openModal();
    });
  }

  function lockFinance() {
    isFinanceUnlocked = false;
  }

  async function canAccessFinance() {
    if (isFinanceUnlocked) return true;
    return promptPassword();
  }

  return { canAccessFinance, lockFinance };
}
