export interface ComponentModel {
  model_id: number;
  model_code: string;
  category: string;
}

export interface Aircraft {
  aircraft_id: number;
  registration_no: string;
  model: string;
  status: string;
}

export interface Component {
  component_id: number;
  serial_no: string;
  model_id: number;
  model_code?: string; // Appended by join
  batch_no: string;
  inbound_date: string;
  status: 'available' | 'installed' | 'under_maintenance' | 'retired' | 'scrapped';
  accumulated_hours: number;
}

export interface InstallationRecord {
  record_id: number;
  component_id: number;
  aircraft_id: number;
  aircraft_reg?: string;
  install_pos: string;
  installed_at: string;
  removed_at: string | null;
  remove_reason: string | null;
}

export interface MaintenanceRecord {
  maint_id: number;
  component_id: number;
  maint_type: string;
  start_time: string;
  end_time: string | null;
  result: string | null;
}

