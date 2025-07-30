class ExpenseTracker {
    constructor() {
        this.expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        this.budget = parseFloat(localStorage.getItem('budget')) || 0;
        this.initializeEventListeners();
        this.updateDisplay();
        this.renderExpenses();
        this.drawCharts();
        this.setTodayDate();
    }

    initializeEventListeners() {
        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });

        document.getElementById('setBudgetBtn').addEventListener('click', () => {
            this.setBudget();
        });

        document.getElementById('filterCategory').addEventListener('change', (e) => {
            this.filterExpenses(e.target.value);
        });

        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllExpenses();
        });
    }

    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    addExpense() {
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;

        const expense = {
            id: Date.now(),
            description,
            amount,
            category,
            date,
            timestamp: new Date().toISOString()
        };

        this.expenses.unshift(expense);
        this.saveToLocalStorage();
        this.updateDisplay();
        this.renderExpenses();
        this.drawCharts();
        this.checkBudgetAlerts();

        // Reset form
        document.getElementById('expenseForm').reset();
        this.setTodayDate();
    }

    setBudget() {
        const budgetAmount = parseFloat(document.getElementById('budgetAmount').value);
        if (budgetAmount && budgetAmount > 0) {
            this.budget = budgetAmount;
            localStorage.setItem('budget', this.budget.toString());
            this.updateDisplay();
            this.checkBudgetAlerts();
            document.getElementById('budgetAmount').value = '';
        }
    }

    deleteExpense(id) {
        this.expenses = this.expenses.filter(expense => expense.id !== id);
        this.saveToLocalStorage();
        this.updateDisplay();
        this.renderExpenses();
        this.drawCharts();
        this.checkBudgetAlerts();
    }

    filterExpenses(category) {
        const filteredExpenses = category ? 
            this.expenses.filter(expense => expense.category === category) : 
            this.expenses;
        this.renderExpensesList(filteredExpenses);
    }

    clearAllExpenses() {
        if (confirm('Are you sure you want to delete all expenses? This action cannot be undone.')) {
            this.expenses = [];
            this.saveToLocalStorage();
            this.updateDisplay();
            this.renderExpenses();
            this.drawCharts();
            document.getElementById('budgetAlerts').style.display = 'none';
        }
    }

    updateDisplay() {
        const totalSpent = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const remaining = this.budget - totalSpent;

        document.getElementById('totalBudget').textContent = `$${this.budget.toFixed(2)}`;
        document.getElementById('totalSpent').textContent = `$${totalSpent.toFixed(2)}`;
        document.getElementById('remaining').textContent = `$${remaining.toFixed(2)}`;

        // Update remaining color based on amount
        const remainingElement = document.getElementById('remaining');
        if (remaining < 0) {
            remainingElement.style.color = '#e53e3e';
        } else if (remaining < this.budget * 0.2) {
            remainingElement.style.color = '#dd6b20';
        } else {
            remainingElement.style.color = '#38a169';
        }
    }

    checkBudgetAlerts() {
        const totalSpent = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const alertsElement = document.getElementById('budgetAlerts');
        
        if (this.budget === 0) {
            alertsElement.style.display = 'none';
            return;
        }

        const percentage = (totalSpent / this.budget) * 100;

        if (percentage >= 100) {
            alertsElement.textContent = '⚠️ Budget exceeded! You have overspent your monthly budget.';
            alertsElement.className = 'budget-alerts danger';
        } else if (percentage >= 80) {
            alertsElement.textContent = '⚠️ Warning: You have used 80% of your monthly budget.';
            alertsElement.className = 'budget-alerts warning';
        } else {
            alertsElement.style.display = 'none';
        }
    }

    renderExpenses() {
        this.renderExpensesList(this.expenses);
    }

    renderExpensesList(expenses) {
        const expensesList = document.getElementById('expensesList');
        
        if (expenses.length === 0) {
            expensesList.innerHTML = '<p style="text-align: center; color: #718096; padding: 20px;">No expenses found.</p>';
            return;
        }

        expensesList.innerHTML = expenses.map(expense => {
            const categoryEmojis = {
                food: '🍔',
                transport: '🚗',
                shopping: '🛍️',
                entertainment: '🎬',
                bills: '💡',
                health: '🏥',
                education: '📚',
                other: '📦'
            };

            return `
                <div class="expense-item">
                    <div class="expense-details">
                        <h4>${categoryEmojis[expense.category]} ${expense.description}</h4>
                        <p>${expense.category.charAt(0).toUpperCase() + expense.category.slice(1)} • ${new Date(expense.date).toLocaleDateString()}</p>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span class="expense-amount">$${expense.amount.toFixed(2)}</span>
                        <button class="expense-delete" onclick="expenseTracker.deleteExpense(${expense.id})" title="Delete expense">×</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    drawCharts() {
        this.drawCategoryChart();
        this.drawMonthlyChart();
    }

    drawCategoryChart() {
        const canvas = document.getElementById('categoryChart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (this.expenses.length === 0) {
            ctx.fillStyle = '#718096';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No expenses to display', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Calculate category totals
        const categoryTotals = {};
        this.expenses.forEach(expense => {
            categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
        });

        const categories = Object.keys(categoryTotals);
        const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

        // Colors for categories
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

        // Draw pie chart
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 50;

        let currentAngle = 0;
        categories.forEach((category, index) => {
            const sliceAngle = (categoryTotals[category] / total) * 2 * Math.PI;
            
            // Draw slice
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + 30);
            const labelY = centerY + Math.sin(labelAngle) * (radius + 30);
            
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(category.charAt(0).toUpperCase() + category.slice(1), labelX, labelY);
            ctx.fillText(`$${categoryTotals[category].toFixed(2)}`, labelX, labelY + 15);

            currentAngle += sliceAngle;
        });

        // Draw title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Expenses by Category', centerX, 30);
    }

    drawMonthlyChart() {
        const canvas = document.getElementById('monthlyChart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (this.expenses.length === 0) {
            ctx.fillStyle = '#718096';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No expenses to display', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Get last 7 days of expenses
        const last7Days = {};
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last7Days[dateStr] = 0;
        }

        this.expenses.forEach(expense => {
            if (last7Days.hasOwnProperty(expense.date)) {
                last7Days[expense.date] += expense.amount;
            }
        });

        const dates = Object.keys(last7Days);
        const amounts = Object.values(last7Days);
        const maxAmount = Math.max(...amounts, 1);

        // Chart dimensions
        const chartWidth = canvas.width - 80;
        const chartHeight = canvas.height - 80;
        const barWidth = chartWidth / dates.length;

        // Draw bars
        dates.forEach((date, index) => {
            const barHeight = (amounts[index] / maxAmount) * chartHeight;
            const x = 40 + index * barWidth;
            const y = canvas.height - 40 - barHeight;

            ctx.fillStyle = '#667eea';
            ctx.fillRect(x + 5, y, barWidth - 10, barHeight);

            // Draw date labels
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.save();
            ctx.translate(x + barWidth / 2, canvas.height - 20);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 0, 0);
            ctx.restore();

            // Draw amount labels
            if (amounts[index] > 0) {
                ctx.fillStyle = '#333';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`$${amounts[index].toFixed(0)}`, x + barWidth / 2, y - 5);
            }
        });

        // Draw title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Daily Expenses (Last 7 Days)', canvas.width / 2, 20);
    }

    saveToLocalStorage() {
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
    }
}

// Initialize the expense tracker when the page loads
let expenseTracker;
document.addEventListener('DOMContentLoaded', () => {
    expenseTracker = new ExpenseTracker();
});
