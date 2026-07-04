select
  pmc.maintenance_code,
  pmc.provider_id as saved_provider_id,
  (p.id is not null) as exists_in_profiles,
  count(s.id) as services_count
from provider_maintenance_codes pmc
left join profiles p
  on p.id = pmc.provider_id
left join services s
  on s.provider_id = pmc.provider_id
group by
  pmc.maintenance_code,
  pmc.provider_id,
  p.id
order by pmc.maintenance_code;
