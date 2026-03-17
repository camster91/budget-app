"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCategory } from "@/app/_actions/categories";

export function CategoryForm() {
    const [rules, setRules] = useState([{ keyword: "", type: "contains" }]);

    const addRule = () => setRules([...rules, { keyword: "", type: "contains" }]);

    const handleSubmit = async (formData: FormData) => {
        formData.append("rules", JSON.stringify(rules));
        await createCategory(formData);
    };

    return (
        <form action={handleSubmit} className="space-y-4">
            <Input name="name" placeholder="Category Name" required />
            <Input name="type" placeholder="Type (expense/income)" required />
            
            <div className="space-y-2">
                <h4 className="font-medium text-sm">Rules</h4>
                {rules.map((rule, index) => (
                    <div key={index} className="flex gap-2">
                        <Input 
                            value={rule.keyword} 
                            onChange={(e) => {
                                const newRules = [...rules];
                                newRules[index].keyword = e.target.value;
                                setRules(newRules);
                            }}
                            placeholder="Keyword" 
                        />
                        <select 
                            value={rule.type}
                            onChange={(e) => {
                                const newRules = [...rules];
                                newRules[index].type = e.target.value;
                                setRules(newRules);
                            }}
                            className="bg-white/[0.05] rounded-md px-2"
                        >
                            <option value="contains">Contains</option>
                            <option value="equals">Equals</option>
                        </select>
                    </div>
                ))}
                <Button type="button" onClick={addRule} variant="outline" size="sm">Add Rule</Button>
            </div>
            
            <Button type="submit">Create Category</Button>
        </form>
    );
}
