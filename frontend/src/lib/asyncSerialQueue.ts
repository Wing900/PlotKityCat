export function createAsyncSerialQueue() {
  let pending: Promise<void> | null = null;

  function enqueue(operation: () => Promise<void>) {
    const previous = pending;
    const task = (previous ? previous.catch(() => undefined) : Promise.resolve()).then(operation);

    pending = task;
    void task.then(
      () => clear(task),
      () => clear(task),
    );
    return task;
  }

  function current() {
    return pending;
  }

  function clear(task: Promise<void>) {
    if (pending === task) {
      pending = null;
    }
  }

  return {
    current,
    enqueue,
  };
}
