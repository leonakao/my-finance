import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { nextGroupForType } from '../lib/transactions'

export function useTransactionEditing(transactions, setTransactions, setError) {
  const [savingId, setSavingId] = useState('')

  async function handleUpdate(id, field, value) {
    setSavingId(id)
    setError('')

    const currentTransaction = transactions.find((transaction) => transaction.id === id)
    const updates =
      field === 'type'
        ? {
            type: value,
            budget_group: nextGroupForType(value, currentTransaction?.budgetGroup ?? ''),
          }
        : { [field]: value }

    const { error: updateError } = await supabase.from('transactions').update(updates).eq('id', id)
    if (updateError) {
      setError(updateError.message)
      setSavingId('')
      return
    }

    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === id
          ? {
              ...transaction,
              ...(field === 'type'
                ? {
                    type: value,
                    budgetGroup: nextGroupForType(value, transaction.budgetGroup),
                  }
                : {
                    [field === 'budget_group' ? 'budgetGroup' : field]: value,
                  }),
            }
          : transaction,
      ),
    )
    setSavingId('')
  }

  return {
    savingId,
    handleUpdate,
  }
}
