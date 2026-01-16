export function getMethodStyle(method: string) {
  switch (method.toUpperCase()) {
    case 'GET':
      return {
        border: 'border-emerald-200 dark:border-emerald-400/40',
        bg: 'bg-emerald-50 dark:bg-emerald-400/10',
        text: 'text-emerald-700 dark:text-emerald-300',
      };
    case 'POST':
      return {
        border: 'border-blue-200 dark:border-blue-400/40',
        bg: 'bg-blue-50 dark:bg-blue-400/10',
        text: 'text-blue-700 dark:text-blue-300',
      };
    case 'PUT':
      return {
        border: 'border-violet-200 dark:border-violet-400/40',
        bg: 'bg-violet-50 dark:bg-violet-400/10',
        text: 'text-violet-700 dark:text-violet-200',
      };
    case 'PATCH':
      return {
        border: 'border-amber-200 dark:border-amber-400/40',
        bg: 'bg-amber-50 dark:bg-amber-400/10',
        text: 'text-amber-700 dark:text-amber-200',
      };
    case 'DELETE':
      return {
        border: 'border-red-200 dark:border-red-400/40',
        bg: 'bg-red-50 dark:bg-red-400/10',
        text: 'text-red-700 dark:text-red-200',
      };
    default:
      return {
        border: 'border-slate-200 dark:border-neutral-600/40',
        bg: 'bg-slate-50 dark:bg-neutral-800/40',
        text: 'text-slate-700 dark:text-neutral-200',
      };
  }
}

export function getStatusStyle(status: string) {
  switch (status) {
    case '2xx':
      return {
        border: 'border-emerald-600 dark:border-emerald-400/60',
        bg: 'bg-emerald-600 dark:bg-emerald-400/30',
        text: 'text-white dark:text-emerald-100',
      };
    case '3xx':
      return {
        border: 'border-blue-600 dark:border-blue-400/60',
        bg: 'bg-blue-600 dark:bg-blue-400/30',
        text: 'text-white dark:text-blue-100',
      };
    case '4xx':
      return {
        border: 'border-amber-600 dark:border-amber-400/60',
        bg: 'bg-amber-600 dark:bg-amber-400/30',
        text: 'text-white dark:text-amber-100',
      };
    case '5xx':
      return {
        border: 'border-red-600 dark:border-red-400/60',
        bg: 'bg-red-600 dark:bg-red-400/30',
        text: 'text-white dark:text-red-100',
      };
    default:
      return {
        border: 'border-slate-600 dark:border-neutral-600/60',
        bg: 'bg-slate-600 dark:bg-neutral-600/30',
        text: 'text-white dark:text-neutral-100',
      };
  }
}

export function getStatusText(status: string) {
  switch (status) {
    case '2xx':
      return 'text-utility-success';
    case '3xx':
      return 'text-utility-accent';
    case '4xx':
      return 'text-utility-warning';
    case '5xx':
      return 'text-utility-error';
    default:
      return 'text-utility-text';
  }
}
