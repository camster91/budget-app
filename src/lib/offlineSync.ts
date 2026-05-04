import { openDB, DBSchema } from "idb";

interface BudgetDB extends DBSchema {
    offlineQueue: {
        key: string;
        value: {
            id: string;
            type: "TRANSACTION_CREATE";
            payload: any /* eslint-disable-line @typescript-eslint/no-explicit-any */; // The formData serialized
            timestamp: number;
        };
    };
}

const DB_NAME = "budget-app-db";

export async function initDB() {
    return openDB<BudgetDB>(DB_NAME, 1, {
        upgrade(db) {
            db.createObjectStore("offlineQueue", { keyPath: "id" });
        },
    });
}

export async function queueOfflineAction(type: "TRANSACTION_CREATE", payload: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    const db = await initDB();
    const id = crypto.randomUUID();
    await db.put("offlineQueue", {
        id,
        type,
        payload,
        timestamp: Date.now(),
    });
}

export async function getOfflineQueue() {
    const db = await initDB();
    return db.getAll("offlineQueue");
}

export async function removeOfflineAction(id: string) {
    const db = await initDB();
    await db.delete("offlineQueue", id);
}

// In a real app, this would be hooked up to a window 'online' event
export async function flushOfflineQueue(processAction: (action: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => Promise<boolean>) {
    const queue = await getOfflineQueue();
    if (queue.length === 0) return;

    for (const item of queue.sort((a, b) => a.timestamp - b.timestamp)) {
        try {
            const success = await processAction(item);
            if (success) {
                await removeOfflineAction(item.id);
            }
        } catch (e) {
            console.error("Failed to process offline action", e);
            // Break loop to maintain ordering, try again later
            break;
        }
    }
}
