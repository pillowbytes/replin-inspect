export function getMethodStyle(method: string) {
  switch (method.toUpperCase()) {
    case 'GET':
      return { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700' };
    case 'POST':
      return { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-700' };
    case 'PUT':
      return { border: 'border-violet-200', bg: 'bg-violet-50', text: 'text-violet-700' };
    case 'PATCH':
      return { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-700' };
    case 'DELETE':
      return { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700' };
    default:
      return { border: 'border-slate-200', bg: 'bg-slate-50', text: 'text-slate-700' };
  }
}

export function getStatusStyle(status: string) {
  switch (status) {
    case '2xx':
      return { border: 'border-emerald-600', bg: 'bg-emerald-600', text: 'text-white' };
    case '3xx':
      return { border: 'border-blue-600', bg: 'bg-blue-600', text: 'text-white' };
    case '4xx':
      return { border: 'border-amber-600', bg: 'bg-amber-600', text: 'text-white' };
    case '5xx':
      return { border: 'border-red-600', bg: 'bg-red-600', text: 'text-white' };
    default:
      return { border: 'border-slate-600', bg: 'bg-slate-600', text: 'text-white' };
  }
}

export function getStatusText(status: string) {
  switch (status) {
    case '2xx':
      return 'text-emerald-700';
    case '3xx':
      return 'text-blue-700';
    case '4xx':
      return 'text-amber-700';
    case '5xx':
      return 'text-red-700';
    default:
      return 'text-gray-900';
  }
}
