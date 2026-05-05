"use client";

import { useTransition } from "react";
import { BillCalendar } from "@/components/bills/BillCalendar";
import { markBillAsPaid } from "@/app/_actions/bills";
import { toast } from "sonner";

interface BillCalendarViewProps {
    bills: {
        id: string;
        name: string;
        amount: number;
        dueDay: number;
        category: { name: string };
    }[];
    paidBillIds: Set<string>;
}

export function BillCalendarView({ bills, paidBillIds }: BillCalendarViewProps) {
    const [isPending, startTransition] = useTransition();

    function handleMarkPaid(id: string) {
        startTransition(async () => {
            const result = await markBillAsPaid(id);
            if (result.success) {
                toast.success("Bill marked as paid!");
            } else {
                toast.error(result.error || "Failed to mark bill as paid");
            }
        });
    }

    function isPaidThisMonth(id: string) {
        return paidBillIds.has(id);
    }

    return (
        <BillCalendar
            bills={bills}
            onMarkPaid={handleMarkPaid}
            isPaidThisMonth={isPaidThisMonth}
        />
    );
}