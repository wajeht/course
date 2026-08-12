type CloseHandler = () => void;

interface ModalEntry {
  close: CloseHandler;
  token: symbol;
}

const stack: ModalEntry[] = [];

export function useModalStack() {
  function register(close: CloseHandler): symbol {
    const token = Symbol("modal");
    stack.push({ close, token });
    return token;
  }

  function unregister(token: symbol): void {
    const index = stack.findIndex((entry) => entry.token === token);
    if (index >= 0) stack.splice(index, 1);
  }

  function isTop(token: symbol): boolean {
    return stack.at(-1)?.token === token;
  }

  function closeTop(): void {
    stack.at(-1)?.close();
  }

  return { closeTop, isTop, register, unregister };
}
