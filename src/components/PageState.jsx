import { AlertCircle, Film, LoaderCircle } from 'lucide-react';

export default function PageState({ loading = false, title, description, action, children }) {
  const Icon = loading ? LoaderCircle : action ? AlertCircle : Film;
  return <div className="page-state" role={loading ? 'status' : action ? 'alert' : undefined}>
    <Icon className={loading ? 'spin' : ''} size={30} aria-hidden="true" />
    <h2>{title}</h2>
    {description && <p>{description}</p>}
    {action && <button className="button button-secondary" onClick={action}>重新加载</button>}
    {children}
  </div>;
}
