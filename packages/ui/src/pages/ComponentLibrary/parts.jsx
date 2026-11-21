export const Section = ({ title, description, children }) => (
  <section className="component_library_section">
    <div className="component_library_section_head">
      <h2 className="component_library_section_title">{title}</h2>
      {description && <p className="component_library_section_description">{description}</p>}
    </div>
    <div className="component_library_section_body">{children}</div>
  </section>
);

export const SubLabel = ({ children }) => <span className="component_library_sub_label">{children}</span>;
