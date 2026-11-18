package com.taskflow.service.task

import com.taskflow.entity.Task
import com.taskflow.entity.TaskPriority
import com.taskflow.exception.BadRequestException
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Expression
import jakarta.persistence.criteria.Order
import jakarta.persistence.criteria.Root
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Component
import java.time.Instant
import java.time.LocalDate

/**
 * Strategy pattern: each way of sorting tasks is its own small class.
 * The `sort` query parameter (e.g. ?sort=priority) picks one through [TaskSortStrategyResolver].
 * Adding a new sort option = adding one @Component here; TaskService doesn't change.
 */
interface TaskSortStrategy {
    /** Value of the `sort` query parameter that selects this strategy. */
    val key: String

    fun orders(root: Root<Task>, cb: CriteriaBuilder, ascending: Boolean): List<Order>

    /**
     * Wraps the ordering in a Specification so it combines with the filter specs.
     * It adds no WHERE condition (returns null); Spring Data drops the ORDER BY for the count query.
     */
    fun toSpecification(ascending: Boolean) = Specification<Task> { root, query, cb ->
        // Task id as a final tie-breaker keeps page boundaries stable when values are equal.
        query?.orderBy(orders(root, cb, ascending) + cb.asc(root.get<Long>("id")))
        null
    }
}

private fun CriteriaBuilder.direction(expression: Expression<*>, ascending: Boolean): Order =
    if (ascending) asc(expression) else desc(expression)

@Component
class CreatedAtSortStrategy : TaskSortStrategy {
    override val key = "createdAt"

    override fun orders(root: Root<Task>, cb: CriteriaBuilder, ascending: Boolean) =
        listOf(cb.direction(root.get<Instant>("createdAt"), ascending))
}

@Component
class DueDateSortStrategy : TaskSortStrategy {
    override val key = "dueDate"

    /** Tasks without a due date always go last, whatever the direction. */
    override fun orders(root: Root<Task>, cb: CriteriaBuilder, ascending: Boolean): List<Order> {
        val dueDate = root.get<LocalDate>("dueDate")
        val missingDateLast = cb.selectCase<Int>()
            .`when`(cb.isNull(dueDate), cb.literal(1))
            .otherwise(cb.literal(0))
        return listOf(cb.asc(missingDateLast), cb.direction(dueDate, ascending))
    }
}

@Component
class PrioritySortStrategy : TaskSortStrategy {
    override val key = "priority"

    /**
     * Priority is stored as text, and alphabetically HIGH < LOW < MEDIUM, which is wrong.
     * A CASE expression turns it into its numeric rank (LOW=1, MEDIUM=2, HIGH=3) before sorting.
     */
    override fun orders(root: Root<Task>, cb: CriteriaBuilder, ascending: Boolean): List<Order> {
        val priority = root.get<TaskPriority>("priority")
        val rank = TaskPriority.entries.fold(cb.selectCase<Int>()) { case, p ->
            case.`when`(cb.equal(priority, p), cb.literal(p.rank))
        }.otherwise(cb.literal(0))
        return listOf(cb.direction(rank, ascending))
    }
}

/** Spring injects every TaskSortStrategy bean; we index them by key. */
@Component
class TaskSortStrategyResolver(strategies: List<TaskSortStrategy>) {

    private val byKey = strategies.associateBy { it.key }

    fun resolve(key: String): TaskSortStrategy =
        byKey[key] ?: throw BadRequestException(
            field = "sort",
            message = "Unsupported sort '$key'. Allowed values: ${byKey.keys.sorted().joinToString()}",
        )
}
