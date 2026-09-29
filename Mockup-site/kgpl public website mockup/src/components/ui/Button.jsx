import { Link } from "react-router-dom";
import Icon from "./Icon";

const variants = {
  primary: "bg-gold text-navy-dark hover:bg-gold-light shadow-soft hover:shadow-lift",
  outline: "border-2 border-white/70 text-white hover:bg-white hover:text-navy",
  outlineDark: "border-2 border-navy/20 text-navy hover:bg-navy hover:text-white",
  ghost: "text-navy hover:bg-navy/5",
  navy: "bg-navy text-white hover:bg-navy-dark shadow-soft hover:shadow-lift",
};

const sizes = {
  md: "text-sm px-5 py-3",
  lg: "text-base px-6 py-3.5",
};

export default function Button({
  children,
  to,
  href,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  icon = "ArrowRight",
  showIcon = true,
  className = "",
  ...rest
}) {
  const classes = `group inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-300 ease-out active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${className}`;

  const content = (
    <>
      <span>{children}</span>
      {showIcon && (
        <Icon
          name={icon}
          size={17}
          className="transition-transform duration-300 group-hover:translate-x-0.5"
        />
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes} {...rest}>
      {content}
    </button>
  );
}
