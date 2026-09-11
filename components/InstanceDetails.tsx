"use client";

import { useState } from "react";
import { X, Terminal, HardDrive, Shield } from "lucide-react";

type Props = {
  instance: any;
  isAws: boolean;
  onClose: () => void;
  onConnect: () => void;
  onSecurityGroup: (group: any) => void;
  onVolumes: () => void;
};

export function InstanceDetails({ instance, isAws, onClose, onConnect, onSecurityGroup, onVolumes }: Props) {
  const [tab, setTab] = useState("Description");
  const tabs = ["Description", "Security", "Networking", "Storage", "Tags"];
  const fields: Record<string, Array<[string, unknown]>> = {
    Description: [
      ["Instance ID", instance.instanceId], ["Instance state", instance.state],
      [isAws ? "Instance type" : "Machine type", instance.tags?.MachineType || instance.instanceType],
      ["Public IPv4 address", instance.publicIp], ["Private IPv4 address", instance.privateIp],
      ["Public DNS", instance.publicDns], ["Private DNS", instance.privateDns],
      ["Availability zone", instance.availabilityZone], ["VPC ID", instance.vpcId],
      ["Subnet ID", instance.subnetId], [isAws ? "AMI ID" : "Image ID", instance.imageId],
      ["Key pair name", instance.keyName], ["Platform", instance.platform],
      ["Architecture", instance.architecture],
      ["Launch time", instance.launchTime ? new Date(instance.launchTime).toLocaleString() : null],
      ["IAM instance profile", instance.iamInstanceProfile],
    ],
    Networking: [["Public IPv4 address", instance.publicIp], ["Private IPv4 address", instance.privateIp], ["Public DNS", instance.publicDns], ["Private DNS", instance.privateDns], ["VPC ID", instance.vpcId], ["Subnet ID", instance.subnetId], ["Availability zone", instance.availabilityZone]],
    Security: [["IAM instance profile", instance.iamInstanceProfile], ["Key pair name", instance.keyName]],
  };
  return (
    <section className="instance-details" aria-label="Instance details">
      <div className="instance-details-heading">
        <div><h2>Instance: {instance.instanceId} <span>({instance.tags?.Name || instance.tags?.name || "Unnamed instance"})</span></h2><p>Public IP: {instance.publicIp || "—"}</p></div>
        <button className="instance-connect" onClick={onConnect}><Terminal size={14} />Connect</button>
        <button onClick={onClose} className="header-icon" aria-label="Close instance details"><X size={18} /></button>
      </div>
      <div className="instance-details-tabs" role="tablist" aria-label="Instance details sections">
        {tabs.map(name => <button key={name} id={`instance-tab-${name}`} role="tab" aria-selected={tab === name} aria-controls="instance-details-content" tabIndex={tab === name ? 0 : -1} onClick={() => setTab(name)} onKeyDown={event => {
          let next: string | undefined;
          if (event.key === "ArrowRight") next = tabs[(tabs.indexOf(name) + 1) % tabs.length];
          if (event.key === "ArrowLeft") next = tabs[(tabs.indexOf(name) + tabs.length - 1) % tabs.length];
          if (event.key === "Home") next = tabs[0];
          if (event.key === "End") next = tabs[tabs.length - 1];
          if (next) { event.preventDefault(); setTab(next); document.getElementById(`instance-tab-${next}`)?.focus(); }
        }}>{name}</button>)}
      </div>
      <div id="instance-details-content" role="tabpanel" aria-labelledby={`instance-tab-${tab}`} tabIndex={0} className="instance-details-content">
        {fields[tab] && <div className="instance-detail-card"><h3>{tab === "Description" ? "Instance details" : tab}</h3><dl className="instance-detail-fields">{fields[tab].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value == null || value === "" || value === "-" ? "—" : String(value)}</dd></div>)}</dl></div>}
        {tab === "Security" && <div className="instance-detail-security"><h3>{isAws ? "Security groups" : "Firewall rules"}</h3>{instance.securityGroups?.length ? instance.securityGroups.map((group: any) => <button className="instance-connect" key={group.groupId} onClick={() => onSecurityGroup(group)}><Shield size={14} />{group.groupName} ({group.groupId})</button>) : <p>No security groups reported.</p>}</div>}
        {tab === "Storage" && <><div className="instance-storage-heading"><h3>Block devices ({instance.blockDeviceMappings?.length || 0})</h3><button className="instance-connect" onClick={onVolumes}><HardDrive size={14} />{isAws ? "Manage volumes" : "Manage disks"}</button></div>{instance.blockDeviceMappings?.length ? <div className="overflow-x-auto"><table><thead><tr><th>Device name</th><th>Volume ID</th><th>Status</th><th>Delete on termination</th></tr></thead><tbody>{instance.blockDeviceMappings.map((device: any) => <tr key={device.DeviceName}><td>{device.DeviceName}</td><td>{device.Ebs?.VolumeId || "—"}</td><td>{device.Ebs?.Status || "—"}</td><td>{device.Ebs?.DeleteOnTermination == null ? "—" : device.Ebs.DeleteOnTermination ? "Yes" : "No"}</td></tr>)}</tbody></table></div> : <p>No block devices reported by this instance.</p>}</>}
        {tab === "Tags" && (Object.keys(instance.tags || {}).length ? <div className="overflow-x-auto"><table><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>{Object.entries(instance.tags).map(([key, value]) => <tr key={key}><td>{key}</td><td>{String(value)}</td></tr>)}</tbody></table></div> : <p>No tags on this instance.</p>)}
      </div>
    </section>
  );
}
