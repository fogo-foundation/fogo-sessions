import type { App } from "../../db-schema";

export const AppDomains = ({ app }: { app: App }) => {
  return (
    <div>
      App {app.name} Domains
      <ul>
        {app.domain_configs.map(({ id, domain }) => (
          <li key={id}>{domain}</li>
        ))}
      </ul>
    </div>
  );
};
