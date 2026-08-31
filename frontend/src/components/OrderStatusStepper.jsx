import React from "react";

/**
 * Horizontal stepper for the order lifecycle: Placed → In Production →
 * Shipped → Delivered. Replaces the old flat status-pill text with a
 * visual that shows how far along an order is at a glance.
 *
 * Cancelled orders get their own distinct badge instead of the stepper,
 * since "cancelled" isn't a step on the normal path.
 */

const STEPS = [
  { key: "placed", label: "Placed" },
  { key: "in_production", label: "In Production" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

export default function OrderStatusStepper({ status }) {
  if (status === "cancelled") {
    return <span className="status-pill cancelled">Cancelled</span>;
  }

  const activeIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.key === status)
  );

  return (
    <div className="order-stepper" role="list" aria-label="Order status">
      {STEPS.map((step, i) => {
        const isDone = i < activeIndex;
        const isCurrent = i === activeIndex;

        return (
          <React.Fragment key={step.key}>
            <div
              className={`order-stepper-step ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`}
              role="listitem"
            >
              <span className="order-stepper-node">{isDone ? "✓" : ""}</span>
              <span className="order-stepper-label">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={`order-stepper-line ${i < activeIndex ? "filled" : ""}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
